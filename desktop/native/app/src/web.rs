use ethone_engine::riot::{tokens_from_url, Host, Tokens, WebWindow};
use ethone_engine::riot_accounts::web_directory;
use std::io::Write;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::oneshot;

const VIDEO_HOSTS: [&str; 2] = ["media.valorant-api.com", "valorant.dyn.riotcdn.net"];

#[derive(Default)]
pub struct NativeHost {
    login: Mutex<bool>,
}

struct ChildWindow {
    killer: Mutex<Option<oneshot::Sender<()>>>,
}

impl WebWindow for ChildWindow {
    fn close(&self) {
        if let Some(killer) = self.killer.lock().ok().and_then(|mut slot| slot.take()) {
            let _ = killer.send(());
        }
    }
}

impl Host for NativeHost {
    fn data_dir(&self) -> Result<PathBuf, String> {
        Ok(crate::services::data_dir())
    }

    fn login_open(&self) -> bool {
        self.login.lock().map(|open| *open).unwrap_or(false)
    }

    fn focus_login(&self) {}

    fn open_web(&self, slot: &str, visible: bool, sender: oneshot::Sender<Tokens>) -> Result<Box<dyn WebWindow>, String> {
        let directory = crate::services::data_dir().join(web_directory(slot));
        let exe = std::env::current_exe().map_err(|error| error.to_string())?;
        let mut command = tokio::process::Command::new(exe);
        command.arg("--web").arg("riot").arg(directory).arg(if visible { "1" } else { "0" }).stdout(Stdio::piped()).stdin(Stdio::null()).kill_on_drop(true);
        let mut child = command.spawn().map_err(|error| error.to_string())?;
        let stdout = child.stdout.take().ok_or("riotFailed")?;
        let (killer, killed) = oneshot::channel();
        if visible {
            if let Ok(mut open) = self.login.lock() {
                *open = true;
            }
        }
        crate::services::svc().rt.spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            let mut sender = Some(sender);
            tokio::select! {
                _ = async {
                    while let Ok(Some(line)) = lines.next_line().await {
                        let tokens = line.parse().ok().and_then(|url| tokens_from_url(&url));
                        if let (Some(tokens), Some(sender)) = (tokens, sender.take()) {
                            let _ = sender.send(tokens);
                        }
                    }
                } => {}
                _ = killed => {}
            }
            let _ = child.start_kill();
            let _ = child.wait().await;
            if visible {
                if let Ok(mut open) = crate::services::svc().host.login.lock() {
                    *open = false;
                }
            }
        });
        Ok(Box::new(ChildWindow { killer: Mutex::new(Some(killer)) }))
    }

    fn clear_web(&self, slot: &str) -> Result<(), String> {
        let directory = crate::services::data_dir().join(web_directory(slot));
        if directory.exists() {
            std::fs::remove_dir_all(directory).map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn login_event(&self, status: &'static str, message: Option<String>) {
        crate::app::post(move |app| crate::pages::eval::login_event(app, status, message));
    }
}

pub fn video_allowed(url: &str) -> bool {
    let Ok(parsed) = url.parse::<reqwest::Url>() else { return false };
    parsed.scheme() == "https" && parsed.host_str().is_some_and(|host| VIDEO_HOSTS.contains(&host))
}

pub fn play_video(url: &str, title: &str) -> Result<(), String> {
    if !video_allowed(url) {
        return Err("Requête refusée".into());
    }
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    std::process::Command::new(exe).args(["--web", "video", url, title]).spawn().map(|_| ()).map_err(|error| error.to_string())
}

pub fn video_page(url: &str) -> String {
    let safe: String = url.chars().filter(|character| !matches!(character, '"' | '<' | '>' | '\'' | '\\')).collect();
    format!("<!doctype html><meta charset=utf-8><style>html,body{{margin:0;height:100%;background:#000}}video{{width:100%;height:100%;object-fit:contain}}</style><video src=\"{safe}\" controls autoplay></video>")
}

pub fn mail_page(html: &str, images: bool) -> String {
    let policy = format!("default-src 'none'; style-src 'unsafe-inline'; img-src data:{}", if images { " https:" } else { "" });
    format!("<!doctype html><html><head><meta charset=utf-8><meta http-equiv=\"Content-Security-Policy\" content=\"{policy}\"><style>body{{margin:0;padding:16px;background:#fff;color:#202124;font:14px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}}img{{max-width:100%;height:auto}}table{{max-width:100%}}a{{color:#0b57d0}}</style></head><body>{html}</body></html>")
}

pub fn show_mail(html: &str, title: &str, images: bool) -> Result<(), String> {
    use std::io::Write as _;
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let mut child = std::process::Command::new(exe).args(["--web", "mail", if images { "1" } else { "0" }, title]).stdin(Stdio::piped()).spawn().map_err(|error| error.to_string())?;
    let mut input = child.stdin.take().ok_or("server")?;
    input.write_all(html.as_bytes()).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn child_main(args: &[String]) {
    use slint::winit_030::winit::application::ApplicationHandler;
    use slint::winit_030::winit::dpi::LogicalSize;
    use slint::winit_030::winit::event::WindowEvent;
    use slint::winit_030::winit::event_loop::{ActiveEventLoop, EventLoop};
    use slint::winit_030::winit::window::{Window, WindowId};

    struct Web {
        kind: String,
        target: String,
        visible: bool,
        title: String,
        window: Option<Window>,
        view: Option<wry::WebView>,
        context: Option<wry::WebContext>,
    }

    impl ApplicationHandler for Web {
        fn resumed(&mut self, event_loop: &ActiveEventLoop) {
            if self.window.is_some() {
                return;
            }
            let (width, height) = match self.kind.as_str() { "video" => (960.0, 560.0), "mail" => (820.0, 760.0), _ => (480.0, 720.0) };
            let attributes = Window::default_attributes().with_title(self.title.clone()).with_inner_size(LogicalSize::new(width, height)).with_visible(self.visible);
            let Ok(window) = event_loop.create_window(attributes) else {
                event_loop.exit();
                return;
            };
            let built = if self.kind == "riot" {
                self.context = Some(wry::WebContext::new(Some(PathBuf::from(&self.target))));
                let context = self.context.as_mut().expect("contexte");
                wry::WebViewBuilder::new_with_web_context(context)
                    .with_url(ethone_engine::riot::AUTHORIZE)
                    .with_navigation_handler(|url: String| {
                        if url.parse().ok().and_then(|parsed| tokens_from_url(&parsed)).is_some() {
                            let mut out = std::io::stdout();
                            let _ = writeln!(out, "{url}");
                            let _ = out.flush();
                            return false;
                        }
                        url.starts_with("https://")
                    })
                    .build(&window)
            } else if self.kind == "mail" {
                wry::WebViewBuilder::new()
                    .with_html(self.target.clone())
                    .with_navigation_handler(|url: String| {
                        if url.starts_with("https://") {
                            let _ = std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", &url]).spawn();
                            return false;
                        }
                        url.starts_with("about:") || url.starts_with("data:")
                    })
                    .build(&window)
            } else {
                let allowed = self.target.clone();
                wry::WebViewBuilder::new()
                    .with_html(video_page(&self.target))
                    .with_navigation_handler(move |url: String| url == allowed || url.starts_with("about:") || url.starts_with("data:"))
                    .build(&window)
            };
            match built {
                Ok(view) => {
                    self.view = Some(view);
                    self.window = Some(window);
                }
                Err(_) => event_loop.exit(),
            }
        }

        fn window_event(&mut self, event_loop: &ActiveEventLoop, _: WindowId, event: WindowEvent) {
            match event {
                WindowEvent::CloseRequested => event_loop.exit(),
                WindowEvent::Resized(size) => {
                    if let Some(view) = &self.view {
                        let _ = view.set_bounds(wry::Rect { position: wry::dpi::PhysicalPosition::new(0, 0).into(), size: wry::dpi::PhysicalSize::new(size.width, size.height).into() });
                    }
                }
                _ => {}
            }
        }
    }

    let kind = args.first().cloned().unwrap_or_default();
    let target = args.get(1).cloned().unwrap_or_default();
    if kind == "video" && !video_allowed(&target) {
        return;
    }
    if kind != "video" && kind != "riot" && kind != "mail" {
        return;
    }
    let mut target = target;
    if kind == "mail" {
        use std::io::Read as _;
        let mut html = String::new();
        let _ = std::io::stdin().take(8 * 1024 * 1024).read_to_string(&mut html);
        target = mail_page(&html, args.get(1).map(String::as_str) == Some("1"));
    }
    let (visible, title) = match kind.as_str() {
        "riot" => (args.get(2).map(String::as_str) != Some("0"), "Compte Riot".to_string()),
        _ => (true, args.get(2).cloned().filter(|title| !title.is_empty()).unwrap_or_else(|| "Ethone".into())),
    };
    let Ok(event_loop) = EventLoop::new() else { return };
    let mut web = Web { kind, target, visible, title, window: None, view: None, context: None };
    let _ = event_loop.run_app(&mut web);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_skin_video_hosts_are_allowed() {
        assert!(video_allowed("https://media.valorant-api.com/x.mp4"));
        assert!(video_allowed("https://valorant.dyn.riotcdn.net/x.mp4"));
        assert!(!video_allowed("http://media.valorant-api.com/x.mp4"));
        assert!(!video_allowed("https://exemple.com/x.mp4"));
        assert!(!video_allowed("https://media.valorant-api.com.exemple.com/x.mp4"));
    }

    #[test]
    fn mail_pages_block_remote_content_unless_asked() {
        assert!(mail_page("<p>x</p>", false).contains("img-src data:\""));
        assert!(mail_page("<p>x</p>", true).contains("img-src data: https:"));
        assert!(mail_page("<p>x</p>", false).contains("default-src 'none'"));
    }

    #[test]
    fn the_video_page_cannot_be_escaped() {
        let page = video_page("https://x/a\"><script>");
        assert!(!page.contains("<script>"));
    }
}
