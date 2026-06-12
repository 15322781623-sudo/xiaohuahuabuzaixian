from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_cors import CORS
import os
import json
import hashlib
import secrets
import base64
import shutil
from datetime import datetime

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(32)

# 配置文件路径
CONFIG_PATH = 'config.json'
UPLOAD_FOLDER = 'uploads'

# 确保上传目录存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 加载或创建配置
def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 创建默认配置
        default_config = {
            'users': {
                'admin': {
                    'password': hashlib.sha256('admin123'.encode()).hexdigest(),
                    'is_admin': True,
                    'token': secrets.token_hex(16),
                    'created_at': datetime.now().isoformat()
                }
            }
        }
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, ensure_ascii=False, indent=2)
        return default_config

config = load_config()

# 密码哈希
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# 检查用户是否登录
def is_logged_in():
    return 'username' in request.cookies

# 生成用户目录
def get_user_dir(username):
    return os.path.join(UPLOAD_FOLDER, username)

# 确保用户目录存在
def ensure_user_dir(username):
    user_dir = get_user_dir(username)
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    return user_dir

@app.route('/')
def index():
    if is_logged_in():
        username = request.cookies.get('username')
        user_dir = get_user_dir(username)
        files = []
        if os.path.exists(user_dir):
            for filename in os.listdir(user_dir):
                if filename.endswith('.bin'):
                    files.append({
                        'name': filename,
                        'url': f'/{config["users"][username]["token"]}/{filename}'
                    })
        return render_template('index.html', username=username, files=files, is_admin=config['users'][username].get('is_admin', False))
    else:
        return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    
    if username in config['users'] and config['users'][username]['password'] == hash_password(password):
        resp = redirect(url_for('index'))
        resp.set_cookie('username', username)
        return resp
    else:
        return render_template('login.html', error='用户名或密码错误')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in config['users']:
            return render_template('register.html', error='用户名已存在')
        
        # 创建新用户
        config['users'][username] = {
            'password': hash_password(password),
            'is_admin': False,
            'token': secrets.token_hex(16),
            'created_at': datetime.now().isoformat()
        }
        
        # 保存配置
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        
        # 确保用户目录存在
        ensure_user_dir(username)
        
        resp = redirect(url_for('index'))
        resp.set_cookie('username', username)
        return resp
    else:
        return render_template('register.html')

@app.route('/logout')
def logout():
    resp = redirect(url_for('index'))
    resp.delete_cookie('username')
    return resp

@app.route('/upload', methods=['POST'])
def upload():
    if not is_logged_in():
        return redirect(url_for('index'))
    
    username = request.cookies.get('username')
    user_dir = ensure_user_dir(username)
    
    if 'files' not in request.files:
        return jsonify({'error': '没有文件被上传'})
    
    files = request.files.getlist('files')
    uploaded_files = []
    
    for file in files:
        if file.filename.endswith('.bin'):
            filepath = os.path.join(user_dir, file.filename)
            file.save(filepath)
            uploaded_files.append({
                'name': file.filename,
                'url': f'/{config["users"][username]["token"]}/{file.filename}'
            })
    
    return jsonify({'files': uploaded_files})

@app.route('/delete/<filename>', methods=['POST'])
def delete_file(filename):
    if not is_logged_in():
        return redirect(url_for('index'))
    
    username = request.cookies.get('username')
    user_dir = get_user_dir(username)
    filepath = os.path.join(user_dir, filename)
    
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({'success': True})
    else:
        return jsonify({'error': '文件不存在'})

@app.route('/<token>/<filename>')
def get_token(token, filename):
    # 查找对应用户
    for username, user_data in config['users'].items():
        if user_data['token'] == token:
            user_dir = get_user_dir(username)
            filepath = os.path.join(user_dir, filename)
            
            if os.path.exists(filepath):
                # 读取bin文件内容
                with open(filepath, 'rb') as f:
                    content = f.read()
                
                # 生成Token响应
                response = {
                    'token': base64.b64encode(content).decode('utf-8'),
                    'server': 'XYZW Server'
                }
                return jsonify(response)
            else:
                return jsonify({'error': '文件不存在'})
    
    return jsonify({'error': '无效的Token'})

@app.route('/change-password', methods=['POST'])
def change_password():
    if not is_logged_in():
        return redirect(url_for('index'))
    
    username = request.cookies.get('username')
    old_password = request.form.get('old_password')
    new_password = request.form.get('new_password')
    
    if config['users'][username]['password'] != hash_password(old_password):
        return jsonify({'error': '原密码错误'})
    
    config['users'][username]['password'] = hash_password(new_password)
    
    # 保存配置
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    return jsonify({'success': True})

@app.route('/delete-account', methods=['POST'])
def delete_account():
    if not is_logged_in():
        return redirect(url_for('index'))
    
    username = request.cookies.get('username')
    
    # 管理员账号不可删除
    if config['users'][username].get('is_admin', False):
        return jsonify({'error': '管理员账号不可删除'})
    
    # 删除用户目录
    user_dir = get_user_dir(username)
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
    
    # 删除用户配置
    del config['users'][username]
    
    # 保存配置
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    resp = redirect(url_for('index'))
    resp.delete_cookie('username')
    return resp

# 创建模板目录和文件
def create_templates():
    templates_dir = 'templates'
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    # 创建login.html
    login_html = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - XYZW Token服务</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 400px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="submit"] {
            width: 100%;
            padding: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        input[type="submit"]:hover {
            background-color: #45a049;
        }
        .error {
            color: red;
            margin-bottom: 15px;
            text-align: center;
        }
        .links {
            margin-top: 20px;
            text-align: center;
        }
        a {
            color: #1890ff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>XYZW Token服务</h1>
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
        <form action="/login" method="post">
            <div class="form-group">
                <label for="username">用户名</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">密码</label>
                <input type="password" id="password" name="password" required>
            </div>
            <input type="submit" value="登录">
        </form>
        <div class="links">
            <a href="/register">注册新账号</a>
        </div>
    </div>
</body>
</html>
    '''
    
    with open(os.path.join(templates_dir, 'login.html'), 'w', encoding='utf-8') as f:
        f.write(login_html)
    
    # 创建register.html
    register_html = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>注册 - XYZW Token服务</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            width: 400px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="submit"] {
            width: 100%;
            padding: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        input[type="submit"]:hover {
            background-color: #45a049;
        }
        .error {
            color: red;
            margin-bottom: 15px;
            text-align: center;
        }
        .links {
            margin-top: 20px;
            text-align: center;
        }
        a {
            color: #1890ff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>注册新账号</h1>
        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}
        <form action="/register" method="post">
            <div class="form-group">
                <label for="username">用户名</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">密码</label>
                <input type="password" id="password" name="password" required>
            </div>
            <input type="submit" value="注册">
        </form>
        <div class="links">
            <a href="/">返回登录</a>
        </div>
    </div>
</body>
</html>
    '''
    
    with open(os.path.join(templates_dir, 'register.html'), 'w', encoding='utf-8') as f:
        f.write(register_html)
    
    # 创建index.html
    index_html = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XYZW Token服务</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .user-info {
            display: flex;
            align-items: center;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        .btn-primary {
            background-color: #1890ff;
            color: white;
        }
        .btn-primary:hover {
            background-color: #40a9ff;
        }
        .btn-danger {
            background-color: #ff4d4f;
            color: white;
        }
        .btn-danger:hover {
            background-color: #ff7875;
        }
        .btn-default {
            background-color: #f0f0f0;
            color: #333;
        }
        .btn-default:hover {
            background-color: #e0e0e0;
        }
        .upload-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            text-align: center;
        }
        .file-list {
            margin-top: 30px;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .file-item:last-child {
            border-bottom: none;
        }
        .file-name {
            font-weight: 500;
        }
        .file-actions {
            display: flex;
            gap: 10px;
        }
        .url-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            margin-top: 5px;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 20px;
            border-radius: 8px;
            width: 400px;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .modal-close {
            cursor: pointer;
            font-size: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
        }
        input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
        .success {
            color: green;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>XYZW Token服务</h1>
            <div class="user-info">
                <span>欢迎, {{ username }}</span>
                <button class="btn btn-default" onclick="openChangePasswordModal()" style="margin-left: 10px;">修改密码</button>
                {% if is_admin %}
                <button class="btn btn-default" style="margin-left: 10px;">管理员</button>
                {% endif %}
                <a href="/logout" class="btn btn-default" style="margin-left: 10px;">退出</a>
            </div>
        </div>
        
        <div class="upload-section">
            <h3>上传BIN文件</h3>
            <form id="upload-form" enctype="multipart/form-data">
                <input type="file" name="files" multiple accept=".bin" required>
                <button type="submit" class="btn btn-primary" style="margin-top: 10px;">上传</button>
            </form>
        </div>
        
        <div class="file-list">
            <h3>已上传文件</h3>
            {% if files %}
                {% for file in files %}
                <div class="file-item">
                    <div>
                        <div class="file-name">{{ file.name }}</div>
                        <input type="text" class="url-input" value="{{ file.url }}" readonly>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-primary" onclick="copyUrl(this)">复制链接</button>
                        <button class="btn btn-danger" onclick="deleteFile('{{ file.name }}')">删除</button>
                    </div>
                </div>
                {% endfor %}
            {% else %}
                <p>暂无文件，请上传BIN文件</p>
            {% endif %}
        </div>
        
        {% if not is_admin %}
        <div style="margin-top: 30px; text-align: center;">
            <button class="btn btn-danger" onclick="confirmDeleteAccount()">注销账号</button>
        </div>
        {% endif %}
    </div>
    
    <!-- 修改密码模态框 -->
    <div id="change-password-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>修改密码</h3>
                <span class="modal-close" onclick="closeChangePasswordModal()">&times;</span>
            </div>
            <form id="change-password-form">
                <div class="form-group">
                    <label for="old-password">原密码</label>
                    <input type="password" id="old-password" name="old_password" required>
                </div>
                <div class="form-group">
                    <label for="new-password">新密码</label>
                    <input type="password" id="new-password" name="new_password" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">确认修改</button>
                <div id="password-message"></div>
            </form>
        </div>
    </div>
    
    <script>
        // 上传文件
        document.getElementById('upload-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.files) {
                    location.reload();
                } else {
                    alert(data.error || '上传失败');
                }
            });
        });
        
        // 复制链接
        function copyUrl(button) {
            const input = button.parentElement.previousElementSibling.querySelector('.url-input');
            input.select();
            document.execCommand('copy');
            alert('链接已复制');
        }
        
        // 删除文件
        function deleteFile(filename) {
            if (confirm('确定要删除这个文件吗？')) {
                fetch(`/delete/${filename}`, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert(data.error || '删除失败');
                    }
                });
            }
        }
        
        // 修改密码
        function openChangePasswordModal() {
            document.getElementById('change-password-modal').style.display = 'block';
        }
        
        function closeChangePasswordModal() {
            document.getElementById('change-password-modal').style.display = 'none';
            document.getElementById('change-password-form').reset();
            document.getElementById('password-message').innerHTML = '';
        }
        
        document.getElementById('change-password-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('/change-password', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                const messageDiv = document.getElementById('password-message');
                if (data.success) {
                    messageDiv.className = 'success';
                    messageDiv.textContent = '密码修改成功';
                    setTimeout(() => {
                        closeChangePasswordModal();
                    }, 1500);
                } else {
                    messageDiv.className = 'error';
                    messageDiv.textContent = data.error || '修改失败';
                }
            });
        });
        
        // 注销账号
        function confirmDeleteAccount() {
            if (confirm('确定要注销账号吗？此操作不可恢复，所有数据将被删除。')) {
                fetch('/delete-account', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        location.href = '/';
                    }
                });
            }
        }
        
        // 关闭模态框
        window.onclick = function(event) {
            const modal = document.getElementById('change-password-modal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    </script>
</body>
</html>
    '''
    
    with open(os.path.join(templates_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)

# 创建模板文件
create_templates()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
