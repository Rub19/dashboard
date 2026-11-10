use i_slint_backend_testing::{ElementHandle, ElementRoot};
use slint::platform::{Key, PointerEventButton, WindowEvent};
use slint::{ComponentHandle, SharedString};
use std::cell::RefCell;
use std::future::Future;
use std::io::Write;
use std::rc::Rc;
use std::task::{Poll, Waker};
use std::time::Duration;

pub type Snap<T> = Rc<dyn Fn(&T, &str)>;

fn sleep(ms: u64) -> impl Future<Output = ()> {
    let state: Rc<RefCell<(bool, Option<Waker>)>> = Rc::default();
    let timer_state = state.clone();
    slint::Timer::single_shot(Duration::from_millis(ms), move || {
        let mut current = timer_state.borrow_mut();
        current.0 = true;
        if let Some(waker) = current.1.take() {
            waker.wake();
        }
    });
    std::future::poll_fn(move |context| {
        let mut current = state.borrow_mut();
        if current.0 {
            Poll::Ready(())
        } else {
            current.1 = Some(context.waker().clone());
            Poll::Pending
        }
    })
}

fn on_screen<T: ComponentHandle>(ui: &T, element: &ElementHandle) -> bool {
    let size = element.size();
    if size.width < 0.5 || size.height < 0.5 || element.computed_opacity() < 0.01 {
        return false;
    }
    let window = ui.window().size().to_logical(ui.window().scale_factor());
    let at = element.absolute_position();
    let (x, y) = (at.x + size.width / 2.0, at.y + size.height / 2.0);
    x >= 0.0 && y >= 0.0 && x <= window.width && y <= window.height
}

fn find<T: ComponentHandle>(ui: &T, label: &str) -> Option<ElementHandle> {
    let exact: Vec<ElementHandle> = ElementHandle::find_by_accessible_label(ui, label).collect();
    if let Some(found) = exact.into_iter().find(|element| on_screen(ui, element)) {
        return Some(found);
    }
    let label = label.to_string();
    ui.root_element()
        .query_descendants()
        .match_predicate(move |element| element.accessible_label().is_some_and(|candidate| candidate.starts_with(label.as_str())))
        .find_all()
        .into_iter()
        .find(|element| on_screen(ui, element))
}

fn find_input<T: ComponentHandle>(ui: &T, label: &str) -> Option<ElementHandle> {
    let inputs: Vec<ElementHandle> = ElementHandle::find_by_accessible_label(ui, label).filter(|element| element.accessible_role() == Some(i_slint_backend_testing::AccessibleRole::TextInput)).collect();
    inputs.into_iter().find(|element| on_screen(ui, element)).or_else(|| find(ui, label))
}

fn any_contains<T: ComponentHandle>(ui: &T, text: &str) -> bool {
    let text = text.to_string();
    ui.root_element()
        .query_descendants()
        .match_predicate(move |element| element.accessible_label().is_some_and(|candidate| candidate.contains(text.as_str())))
        .find_all()
        .iter()
        .any(|element| on_screen(ui, element))
}

fn key_text(name: &str) -> Option<SharedString> {
    let key = match name {
        "Escape" | "Échap" => Key::Escape,
        "Return" | "Enter" | "Entrée" => Key::Return,
        "Tab" => Key::Tab,
        "Backspace" => Key::Backspace,
        "Delete" | "Suppr" => Key::Delete,
        "Left" => Key::LeftArrow,
        "Right" => Key::RightArrow,
        "Up" => Key::UpArrow,
        "Down" => Key::DownArrow,
        "Home" => Key::Home,
        "End" => Key::End,
        "PageUp" => Key::PageUp,
        "PageDown" => Key::PageDown,
        "Ctrl" => Key::Control,
        "Alt" => Key::Alt,
        "Shift" | "Maj" => Key::Shift,
        "Space" => return Some(" ".into()),
        "F1" => Key::F1,
        "F2" => Key::F2,
        "F5" => Key::F5,
        "F11" => Key::F11,
        other if other.chars().count() == 1 => return Some(other.to_lowercase().into()),
        _ => return None,
    };
    Some(key.into())
}

fn center(element: &ElementHandle) -> slint::LogicalPosition {
    let (at, size) = (element.absolute_position(), element.size());
    slint::LogicalPosition::new(at.x + size.width / 2.0, at.y + size.height / 2.0)
}

async fn click_on<T: ComponentHandle>(ui: &T, element: &ElementHandle, button: PointerEventButton, count: usize) {
    let position = center(element);
    for _ in 0..count {
        element.single_click(button).await;
        if !element.is_valid() {
            ui.window().dispatch_event(WindowEvent::PointerMoved { position });
            ui.window().dispatch_event(WindowEvent::PointerReleased { position, button });
            break;
        }
        sleep(40).await;
    }
}

async fn press<T: ComponentHandle>(ui: &T, spec: &str) -> Result<(), String> {
    let parts: Vec<&str> = spec.split('+').map(str::trim).collect();
    let texts: Vec<SharedString> = parts.iter().map(|part| key_text(part).ok_or_else(|| format!("touche inconnue : {part}"))).collect::<Result<_, _>>()?;
    for text in &texts {
        ui.window().dispatch_event(WindowEvent::KeyPressed { text: text.clone() });
    }
    sleep(20).await;
    for text in texts.iter().rev() {
        ui.window().dispatch_event(WindowEvent::KeyReleased { text: text.clone() });
    }
    Ok(())
}

async fn step<T: ComponentHandle>(ui: &T, verb: &str, arg: &str, snap: &Snap<T>) -> Result<String, String> {
    let (left, right) = arg.split_once('|').map_or((arg, ""), |(a, b)| (a.trim(), b.trim()));
    match verb {
        "wait" => {
            sleep(arg.parse().unwrap_or(500)).await;
            Ok(String::new())
        }
        "click" | "dclick" | "rclick" => {
            let element = find(ui, left).ok_or("introuvable à l'écran")?;
            let button = if verb == "rclick" { PointerEventButton::Right } else { PointerEventButton::Left };
            let label = element.accessible_label().unwrap_or_default();
            click_on(ui, &element, button, if verb == "dclick" { 2 } else { 1 }).await;
            Ok(format!("« {label} »"))
        }
        "invoke" => {
            let element = find(ui, left).ok_or("introuvable à l'écran")?;
            element.invoke_accessible_default_action();
            Ok(String::new())
        }
        "type" => {
            let element = find_input(ui, left).ok_or("champ introuvable")?;
            click_on(ui, &element, PointerEventButton::Left, 1).await;
            press(ui, "Ctrl+a").await?;
            press(ui, "Backspace").await?;
            for character in right.chars() {
                let text: SharedString = character.to_string().into();
                ui.window().dispatch_event(WindowEvent::KeyPressed { text: text.clone() });
                ui.window().dispatch_event(WindowEvent::KeyReleased { text });
                sleep(15).await;
            }
            Ok(String::new())
        }
        "set" => {
            let element = find_input(ui, left).ok_or("champ introuvable")?;
            element.set_accessible_value(right);
            Ok(String::new())
        }
        "key" => press(ui, arg).await.map(|()| String::new()),
        "scroll" => {
            let element = find(ui, left).ok_or("introuvable à l'écran")?;
            element.scroll(0.0, right.parse().unwrap_or(-300.0));
            Ok(String::new())
        }
        "scrollto" => {
            let (x, y) = right.split_once(',').and_then(|(x, y)| Some((x.trim().parse::<f32>().ok()?, y.trim().parse::<f32>().ok()?))).ok_or("point attendu : libellé|x,y")?;
            for attempt in 0..60 {
                if find(ui, left).is_some() {
                    return Ok(String::new());
                }
                let target = ElementHandle::find_by_accessible_label(ui, left).next();
                let window = ui.window().size().to_logical(ui.window().scale_factor());
                let down = match target {
                    Some(element) => element.absolute_position().y > window.height / 2.0,
                    None => attempt >= 25,
                };
                let position = slint::LogicalPosition::new(x, y);
                ui.window().dispatch_event(WindowEvent::PointerMoved { position });
                ui.window().dispatch_event(WindowEvent::PointerScrolled { position, delta_x: 0.0, delta_y: if down { -120.0 } else { 120.0 } });
                sleep(60).await;
            }
            let seen: Vec<String> = ElementHandle::find_by_accessible_label(ui, left).map(|element| format!("{:.0},{:.0} {:.0}x{:.0}", element.absolute_position().x, element.absolute_position().y, element.size().width, element.size().height)).collect();
            Err(format!("toujours hors de l'écran ({})", seen.join(" ; ")))
        }
        "waitfor" => {
            let limit: u64 = right.parse().unwrap_or(20000);
            let mut waited = 0;
            while !any_contains(ui, left) {
                if waited >= limit {
                    return Err(format!("absent après {} s", limit / 1000));
                }
                sleep(250).await;
                waited += 250;
            }
            Ok(format!("après {:.1} s", waited as f64 / 1000.0))
        }
        "expect" => any_contains(ui, arg).then(String::new).ok_or_else(|| "absent de l'écran".to_string()),
        "absent" => (!any_contains(ui, arg)).then(String::new).ok_or_else(|| "encore à l'écran".to_string()),
        "value" => {
            let element = find_input(ui, left).ok_or("champ introuvable")?;
            let value = element.accessible_value().unwrap_or_default();
            (value == right).then(String::new).ok_or_else(|| format!("valeur « {value} »"))
        }
        "snap" => {
            snap(ui, arg);
            Ok(String::new())
        }
        "dump" => {
            let window = ui.window().size().to_logical(ui.window().scale_factor());
            let labels: Vec<String> = ui
                .root_element()
                .query_descendants()
                .match_predicate(|element| element.accessible_label().is_some_and(|label| !label.is_empty()))
                .find_all()
                .iter()
                .take(400)
                .map(|element| {
                    let (at, size) = (element.absolute_position(), element.size());
                    format!("{} @{:.0},{:.0} {:.0}x{:.0} {}", element.accessible_label().unwrap_or_default(), at.x, at.y, size.width, size.height, if on_screen(ui, element) { "visible" } else { "caché" })
                })
                .collect();
            Ok(format!("fenêtre {:.0}x{:.0}, {} libellés\n{}", window.width, window.height, labels.len(), labels.join("\n")))
        }
        _ => Err(format!("action inconnue : {verb}")),
    }
}

pub fn start<T: ComponentHandle + 'static>(ui: &T, prefix: &str, snap: Snap<T>) {
    let Ok(script) = std::env::var(format!("{prefix}_E2E")) else { return };
    let log_path = std::env::var(format!("{prefix}_E2E_LOG")).unwrap_or_else(|_| format!("{script}.log"));
    let pause: u64 = std::env::var(format!("{prefix}_E2E_PAUSE")).ok().and_then(|text| text.parse().ok()).unwrap_or(300);
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_secs(900));
        std::process::exit(3);
    });
    let weak = ui.as_weak();
    let _ = slint::spawn_local(async move {
        let text = std::fs::read_to_string(&script).unwrap_or_default().trim_start_matches('\u{feff}').to_string();
        let mut log = std::fs::File::create(&log_path).ok();
        let mut write = |line: String| {
            println!("{line}");
            if let Some(file) = log.as_mut() {
                let _ = writeln!(file, "{line}");
            }
        };
        sleep(1500).await;
        let (mut passed, mut failed) = (0, 0);
        for (number, raw) in text.lines().enumerate() {
            let line = raw.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if line == "quit" {
                break;
            }
            let Some(ui) = weak.upgrade() else { break };
            let (verb, arg) = line.split_once(' ').map_or((line, ""), |(verb, arg)| (verb, arg.trim()));
            match step(&ui, verb, arg, &snap).await {
                Ok(detail) => {
                    passed += 1;
                    write(format!("OK    {:>3}  {line} {detail}", number + 1));
                }
                Err(error) => {
                    failed += 1;
                    snap(&ui, &format!("echec-{:03}", number + 1));
                    write(format!("ÉCHEC {:>3}  {line} : {error}", number + 1));
                }
            }
            sleep(pause).await;
        }
        write(format!("RÉSULTAT {passed} réussis, {failed} en échec"));
        std::process::exit(if failed == 0 { 0 } else { 1 });
    });
}
