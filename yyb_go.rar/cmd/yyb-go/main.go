package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"yyb_go/internal/httpapi"
)

func main() {
	host := flag.String("host", "127.0.0.1", "listen host")
	port := flag.Int("port", 8000, "listen port")
	resourceRoot := flag.String("resource-root", filepath.Join(".", "resource"), "runtime resource directory")
	dbFilename := flag.String("db", httpapi.DefaultDBFilename, "SQLite database filename under resource/db")
	tcpProxy := flag.String("tcp-proxy", "", "optional TCP proxy: socks5://host:port or http-connect://host:port")
	renewInterval := flag.Duration("renew-interval", time.Hour, "auto renew check interval for stored accounts (0 to disable)")
	renewMaxAge := flag.Duration("renew-max-age", 7*24*time.Hour, "refresh account credentials older than this duration")
	flag.Parse()

	cfg := httpapi.Config{
		ResourceRoot:   *resourceRoot,
		DBFilename:     *dbFilename,
		TCPProxy:       *tcpProxy,
		SessionTTL:     30 * time.Minute,
		RequestTimeout: 8 * time.Second,
		AvatarTimeout:  10 * time.Second,
		ScanTimeout:    180 * time.Second,
		QRSessionTTL:   5 * time.Minute,
		RenewInterval:  *renewInterval,
		RenewMaxAge:    *renewMaxAge,
	}

	app, err := httpapi.NewApp(cfg)
	if err != nil {
		log.Fatalf("init app: %v", err)
	}
	defer app.Close()

	// 启动后台常驻自动续期任务（每 7 天刷新应用宝凭证，保持登录态永久保活）
	app.StartAutoRenew()

	addr := fmt.Sprintf("%s:%d", *host, *port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           app.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("YYB Go service listening on http://%s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	select {
	case <-stop:
	case <-app.ShutdownSignal():
		log.Printf("shutdown requested via /shutdown API")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
