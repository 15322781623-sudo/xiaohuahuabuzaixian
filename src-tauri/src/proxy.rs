/// 本地 HTTP + WebSocket 代理（方案 B）
///
/// 架构：
///   前端 XHR/fetch/WebSocket → Hook JS 改写 URL → 127.0.0.1:PROXY_PORT
///   Rust proxy 补齐 wx_mini_1 全套请求头后转发 → 游戏服务器
///
/// 前端不改一行业务代码，仅通过 lib.rs 的 JS 注入即可完成。
///
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub const PROXY_PORT: u16 = 19863;

// ══════════════════════════════════════════
//  wx_mini_1 请求头常量
// ══════════════════════════════════════════
const WX_UA: &str = concat!(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ",
    "Chrome/139.0.0.0 Safari/537.36 ",
    "MicroMessenger/7.0.22.2380(0x67022150) NetType/WIFI ",
    "MiniProgramEnv/Windows ",
    "WindowsWechat/WMPF WindowsWechat(0x6800002B) ",
    "UnifiedPCWindowsWechat(0xf2541937) XWEB/21093",
);
const WX_ORIGIN: &str = "https://servicewechat.com";
const WX_REFERER: &str = "https://servicewechat.com/wx0840558555a454ed/331/page-frame.html";

// ══════════════════════════════════════════
//  启动代理服务器（后台线程）
// ══════════════════════════════════════════
pub fn start_proxy_server() {
    let addr = format!("127.0.0.1:{}", PROXY_PORT);
    let listener = match TcpListener::bind(&addr) {
        Ok(l) => l,
        Err(e) => {
            log::error!("[wx_proxy] 绑定 {} 失败: {}", addr, e);
            return;
        }
    };
    log::info!("[wx_proxy] 代理已启动 → http://{}", addr);

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(s) => {
                    let _ = s.set_read_timeout(Some(Duration::from_secs(30)));
                    thread::spawn(|| dispatch(s));
                }
                Err(e) => log::error!("[wx_proxy] accept: {}", e),
            }
        }
    });
}

// ══════════════════════════════════════════
//  预读前缀流：将已读取的 buffer 重放到流最前面
//  解决 dispatch() 预读后 tungstenite::accept() 读不到 WebSocket 升级请求的问题
// ══════════════════════════════════════════

struct PrefixedStream {
    prefix: Vec<u8>,
    pos: usize,
    stream: TcpStream,
}

impl Read for PrefixedStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.pos < self.prefix.len() {
            let remaining = &self.prefix[self.pos..];
            let n = remaining.len().min(buf.len());
            buf[..n].copy_from_slice(&remaining[..n]);
            self.pos += n;
            Ok(n)
        } else {
            self.stream.read(buf)
        }
    }
}

impl Write for PrefixedStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.stream.write(buf)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.stream.flush()
    }
}

// ══════════════════════════════════════════
//  连接分发：HTTP / WebSocket
// ══════════════════════════════════════════
fn dispatch(mut stream: TcpStream) {
    let mut buf = vec![0u8; 65536];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    buf.truncate(n);

    let text = String::from_utf8_lossy(&buf);
    if text.contains("Upgrade: websocket") || text.contains("upgrade: websocket") {
        // 使用 PrefixedStream 重放预读数据，确保 tungstenite::accept() 能读到完整升级请求
        let text_owned = text.to_string();
        let prefixed = PrefixedStream { prefix: buf, pos: 0, stream };
        proxy_ws(prefixed, &text_owned);
    } else {
        proxy_http(stream, &buf);
    }
}

// ══════════════════════════════════════════
//  HTTP 代理
// ══════════════════════════════════════════

fn proxy_http(mut stream: TcpStream, raw: &[u8]) {
    let (head, body) = split_head_body(raw);
    let headers = parse_headers(head);

    // ── OPTIONS 预检（CORS）──
    let first_line = String::from_utf8_lossy(head)
        .lines()
        .next()
        .unwrap_or("")
        .to_string();
    if first_line.starts_with("OPTIONS") {
        let _ = stream.write_all(
            b"HTTP/1.1 204 No Content\r\n\
Access-Control-Allow-Origin: *\r\n\
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n\
Access-Control-Allow-Headers: X-Target-Url, X-Target-Method, Content-Type\r\n\
Access-Control-Max-Age: 86400\r\n\
Connection: close\r\n\r\n"
        );
        return;
    }

    let target_url = match header_get(&headers, "x-target-url") {
        Some(u) => u.to_string(),
        None => {
            let _ = stream.write_all(
                b"HTTP/1.1 400 Missing X-Target-Url\r\n\
Access-Control-Allow-Origin: *\r\n\
Connection: close\r\n\r\n"
            );
            return;
        }
    };

    let method = header_get(&headers, "x-target-method")
        .unwrap_or("GET")
        .to_uppercase();

    log::info!("[wx_proxy] {} {:.120}", method, target_url);

    // ── 构建 ureq 请求 ──
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(30))
        .build();

    let mut req = match method.as_str() {
        "GET" => agent.get(&target_url),
        "POST" => agent.post(&target_url),
        "PUT" => agent.put(&target_url),
        "DELETE" => agent.delete(&target_url),
        _ => agent.get(&target_url),
    };

    // 补齐 wx_mini_1 请求头（ureq::Request::set 消费 self，返回 Self）
    req = req.set("User-Agent", WX_UA);
    req = req.set("Accept", "*/*");
    req = req.set("xweb_xhr", "1");
    req = req.set("X-Requested-With", "XMLHttpRequest");
    req = set_origin_referer(req, &target_url);

    if let Some(ct) = header_get(&headers, "content-type") {
        req = req.set("Content-Type", ct);
    }

    // ── 发送 ──
    match req.send_bytes(body) {
        Ok(resp) => {
            let status = resp.status();
            let resp_text = resp.into_string().unwrap_or_default();
            let answer = format!(
                "HTTP/1.1 {} OK\r\n\
Access-Control-Allow-Origin: *\r\n\
Content-Length: {}\r\n\
Content-Type: application/octet-stream\r\n\
Connection: close\r\n\r\n{}",
                status,
                resp_text.len(),
                resp_text
            );
            let _ = stream.write_all(answer.as_bytes());
        }
        Err(e) => {
            log::error!("[wx_proxy] HTTP 失败: {} → {}", target_url, e);
            let msg = format!("Proxy Error: {}", e);
            let answer = format!(
                "HTTP/1.1 502 Bad Gateway\r\n\
Access-Control-Allow-Origin: *\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n{}",
                msg.len(),
                msg
            );
            let _ = stream.write_all(answer.as_bytes());
        }
    }
}

// ══════════════════════════════════════════
//  WebSocket 代理（Arc<Mutex<>> 双向转发）
// ══════════════════════════════════════════

fn proxy_ws(stream: impl Read + Write + Send + 'static, head_text: &str) {
    let target_url = match extract_ws_target(head_text) {
        Some(u) => u,
        None => {
            // 无法返回错误，直接关闭连接
            return;
        }
    };

    log::info!("[wx_proxy] WS → {:.120}", target_url);

    // Step 1: 接受前端 WebSocket
    let ws_front = match tungstenite::accept(stream) {
        Ok(w) => Arc::new(Mutex::new(w)),
        Err(e) => {
            log::error!("[wx_proxy] WS accept 失败: {}", e);
            return;
        }
    };

    // Step 2: 构建到游戏服务器的 WS 请求（带 wx_mini_1 头）
    let mut req_builder = http::Request::builder()
        .uri(target_url.as_str())
        .header("User-Agent", WX_UA)
        .header("Origin", WX_ORIGIN)
        .header("xweb_xhr", "1");

    if let Some(host) = extract_host(&target_url) {
        if host.contains("service-battle.hortorgames.com") {
            let origin = if target_url.starts_with("wss://") {
                format!("https://{}", host)
            } else {
                format!("http://{}", host)
            };
            req_builder = req_builder
                .header("Origin", origin.as_str())
                .header("Referer", format!("{}/", origin).as_str());
        }
    }

    let client_req = match req_builder.body(()) {
        Ok(r) => r,
        Err(e) => {
            log::error!("[wx_proxy] WS 构建请求失败: {}", e);
            return;
        }
    };

    // Step 3: 连接游戏服务器
    let (ws_back_raw, _) = match tungstenite::connect(client_req) {
        Ok(c) => c,
        Err(e) => {
            log::error!("[wx_proxy] WS 连接目标失败: {} → {}", target_url, e);
            return;
        }
    };
    let ws_back = Arc::new(Mutex::new(ws_back_raw));

    // Step 4: 双向消息转发
    //  线程 A: 前端读 → 后端写
    //  线程 B: 后端读 → 前端写
    let ws_front_a = ws_front.clone();
    let ws_back_a = ws_back.clone();
    let ws_front_b = ws_front.clone();
    let ws_back_b = ws_back.clone();

    let t_a = thread::spawn(move || {
        loop {
            let msg = match ws_front_a.lock() {
                Ok(mut w) => match w.read() {
                    Ok(m) => m,
                    Err(e) => {
                        log::error!("[wx_proxy] WS 前端读: {}", e);
                        break;
                    }
                },
                Err(_) => break,
            };
            let is_close = msg.is_close();
            if let Ok(mut w) = ws_back_a.lock() {
                let _ = w.send(msg);
            }
            if is_close {
                break;
            }
        }
    });

    let t_b = thread::spawn(move || {
        loop {
            let msg = match ws_back_b.lock() {
                Ok(mut w) => match w.read() {
                    Ok(m) => m,
                    Err(e) => {
                        log::error!("[wx_proxy] WS 后端读: {}", e);
                        break;
                    }
                },
                Err(_) => break,
            };
            let is_close = msg.is_close();
            if let Ok(mut w) = ws_front_b.lock() {
                let _ = w.send(msg);
            }
            if is_close {
                break;
            }
        }
    });

    let _ = t_a.join();
    let _ = t_b.join();
    log::info!("[wx_proxy] WS 连接关闭");
}

// ══════════════════════════════════════════
//  Origin / Referer 按域名分发
// ══════════════════════════════════════════

fn set_origin_referer(mut req: ureq::Request, url: &str) -> ureq::Request {
    if url.contains("service-battle.hortorgames.com") {
        if let Some(host) = extract_host(url) {
            let prefix = if url.starts_with("https") { "https://" } else { "http://" };
            let origin = format!("{}{}", prefix, host);
            req = req.set("Origin", &origin);
            req = req.set("Referer", &format!("{}/", origin));
        }
    } else if url.contains("open.weixin.qq.com") || url.contains("comb-platform.hortorgames.com") {
        req = req.set("Origin", "https://open.weixin.qq.com");
        req = req.set("Referer", "https://open.weixin.qq.com/");
    } else if url.contains("hortorgames.com") || url.contains("servicewechat.com") {
        req = req.set("Origin", WX_ORIGIN);
        req = req.set("Referer", WX_REFERER);
    }
    req
}

// ══════════════════════════════════════════
//  字符串工具：host 提取
// ══════════════════════════════════════════

fn extract_host(url: &str) -> Option<&str> {
    let s = url
        .strip_prefix("wss://")
        .or_else(|| url.strip_prefix("ws://"))
        .or_else(|| url.strip_prefix("https://"))
        .or_else(|| url.strip_prefix("http://"))?;
    s.split('/').next()
}

// ══════════════════════════════════════════
//  轻量 HTTP 头解析（零依赖）
// ══════════════════════════════════════════

type Headers = Vec<(String, String)>;

fn split_head_body(raw: &[u8]) -> (&[u8], &[u8]) {
    if let Some(pos) = raw.windows(4).position(|w| w == b"\r\n\r\n") {
        (&raw[..pos], &raw[pos + 4..])
    } else {
        (raw, &[])
    }
}

fn parse_headers(head: &[u8]) -> Headers {
    let text = String::from_utf8_lossy(head);
    let mut headers = Vec::new();
    for line in text.lines().skip(1) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Some(pos) = trimmed.find(':') {
            let k = trimmed[..pos].trim().to_lowercase();
            let v = trimmed[pos + 1..].trim().to_string();
            headers.push((k, v));
        }
    }
    headers
}

fn header_get<'a>(headers: &'a Headers, name: &str) -> Option<&'a str> {
    let lower = name.to_lowercase();
    headers
        .iter()
        .find(|(k, _)| k == &lower)
        .map(|(_, v)| v.as_str())
}

// ══════════════════════════════════════════
//  WebSocket target 参数提取
// ══════════════════════════════════════════

fn extract_ws_target(head: &str) -> Option<String> {
    let first_line = head.lines().next()?;
    // GET /ws?target=wss%3A%2F%2F... HTTP/1.1
    let path = first_line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
            if k == "target" {
                return percent_decode(v);
            }
        }
    }
    None
}

fn percent_decode(s: &str) -> Option<String> {
    let mut result = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hi = hex_val(bytes[i + 1])?;
            let lo = hex_val(bytes[i + 2])?;
            result.push((hi << 4 | lo) as char);
            i += 3;
        } else if bytes[i] == b'+' {
            result.push(' ');
            i += 1;
        } else {
            result.push(bytes[i] as char);
            i += 1;
        }
    }
    Some(result)
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'A'..=b'F' => Some(b - b'A' + 10),
        b'a'..=b'f' => Some(b - b'a' + 10),
        _ => None,
    }
}
