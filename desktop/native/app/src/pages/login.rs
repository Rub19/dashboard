use crate::app::{request_render, spawn, App};
use crate::i18n::{error_text, lang, t, tv, tr};
use crate::services::{open_site, svc};
use crate::vm::*;
use ethone_engine::auth::Stage;
use slint::ComponentHandle;

#[derive(Default)]
pub struct LoginState {
    pub otp: bool,
    pub otp_sent: bool,
    pub email: String,
    pub password: String,
    pub code: String,
    pub show_password: bool,
    pub forget_me: bool,
    pub use_backup: bool,
    pub busy: bool,
    pub done: bool,
    pub waiting: bool,
    pub error: Option<String>,
    pub shake: i32,
}

pub fn fail(app: &mut App, reason: &str) {
    app.login.error = Some(error_text(reason));
    app.login.busy = false;
    app.login.shake += 1;
    let shake = app.login.shake;
    app.with_ui(|ui| ui.set_shake(shake));
}

pub fn finish(app: &mut App, stage: Stage) {
    app.login.busy = false;
    app.login.code.clear();
    app.login.password.clear();
    if matches!(stage, Stage::SignedIn { .. }) {
        app.login.done = true;
        request_render();
        let delay = if crate::theme::reduced_motion() { 0 } else { 480 };
        svc().rt.spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
            crate::app::post(move |app| crate::pages::shell::enter(app, stage));
        });
    } else {
        app.stage = Some(stage);
    }
}

fn submit(app: &mut App) {
    if app.login.busy || app.login.done {
        return;
    }
    let mfa = matches!(app.stage, Some(Stage::MfaRequired { .. }));
    app.login.busy = true;
    app.login.error = None;
    let (email, password, code, remember, backup) = (app.login.email.trim().to_string(), app.login.password.clone(), app.login.code.trim().to_string(), !app.login.forget_me, app.login.use_backup);
    if mfa {
        spawn(async move { svc().auth.mfa(if backup { None } else { Some(code.clone()) }, if backup { Some(code) } else { None }).await }, done);
    } else if !app.login.otp {
        spawn(async move { svc().auth.password(&email, &password, remember).await }, done);
    } else if !app.login.otp_sent {
        spawn(async move { svc().auth.otp_send(&email).await }, |app, result| match result {
            Ok(()) => {
                app.login.busy = false;
                app.login.otp_sent = true;
            }
            Err(error) => fail(app, &error),
        });
    } else {
        spawn(async move { svc().auth.otp_verify(&email, &code, remember).await }, done);
    }
}

fn done(app: &mut App, result: Result<Stage, String>) {
    match result {
        Ok(stage) => finish(app, stage),
        Err(error) => fail(app, &error),
    }
}

pub fn callback_result(app: &mut App, result: Result<Stage, String>) {
    app.login.waiting = false;
    done(app, result);
}

pub fn act(app: &mut App, id: &str, value: &str) {
    match id {
        "email" => app.login.email = value.to_string(),
        "password" => app.login.password = value.to_string(),
        "code" => app.login.code = value.to_string(),
        "email:submit" | "password:submit" | "code:submit" | "submit" => submit(app),
        "reveal" => app.login.show_password = !app.login.show_password,
        "remember" => app.login.forget_me = value != "true",
        "tab:password" | "tab:otp" => {
            app.login.otp = id == "tab:otp";
            app.login.otp_sent = false;
            app.login.error = None;
            app.login.code.clear();
        }
        "change-email" => {
            app.login.otp_sent = false;
            app.login.code.clear();
        }
        "backup" => {
            app.login.use_backup = !app.login.use_backup;
            app.login.code.clear();
        }
        "sign-out" => spawn(async { svc().auth.sign_out().await }, |app, ()| app.stage = Some(Stage::SignedOut)),
        "cancel" => {
            app.login.waiting = false;
            spawn(async { svc().auth.oauth_cancel().await }, |_, ()| {});
        }
        "language" => {
            crate::prefs::write("ethone-language", if lang() == "fr" { "en" } else { "fr" });
            app.with_ui(|ui| {
                crate::app::with_labels(ui);
            });
        }
        "retry-blocked" => crate::pages::shell::boot(),
        other => {
            if let Some(provider) = other.strip_prefix("provider:") {
                let provider = provider.to_string();
                app.login.busy = true;
                app.login.error = None;
                spawn(
                    async move {
                        crate::background::register_protocol()?;
                        let url = svc().auth.oauth_url(&provider).await?;
                        crate::services::open_url(&url)
                    },
                    |app, result| match result {
                        Ok(()) => {
                            app.login.busy = false;
                            app.login.waiting = true;
                        }
                        Err(error) => fail(app, &error),
                    },
                );
            } else if let Some(page) = other.strip_prefix("site:") {
                let _ = open_site(page);
            }
        }
    }
}

pub fn view(app: &mut App) -> Vec<B> {
    if app.blocked {
        let logo = crate::assets::logo();
        return vec![
            B { kind: "logo", image: logo, title: tr("Ethone est déjà ouvert", "Ethone is already open"), sub: tr("Ferme l'ancienne version d'Ethone, puis réessaie. Les deux versions ne peuvent pas partager la même session.", "Close the old Ethone version, then try again. Both versions cannot share one session."), ..Default::default() },
            space(10.0),
            row(vec![primary("login:retry-blocked", &t("retry")).grow()]),
        ];
    }
    if app.stage.is_none() {
        return vec![B { kind: "logo", image: crate::assets::logo(), title: "Ethone".into(), sub: t("loading"), ..Default::default() }];
    }
    let mfa = matches!(app.stage, Some(Stage::MfaRequired { .. }));
    let state = &app.login;
    let (done, waiting, otp, otp_sent, use_backup, busy, show, forget, error) = (state.done, state.waiting, state.otp, state.otp_sent, state.use_backup, state.busy, state.show_password, state.forget_me, state.error.clone());
    let (email, password, code) = (state.email.clone(), state.password.clone(), state.code.clone());
    let title = if done { t("signedIn") } else if mfa { t("mfaTitle") } else if waiting { t("waitingBrowser") } else { t("signInTitle") };
    let sub = if done { " ".to_string() } else if mfa { t("mfaSub") } else if waiting { t("waitingBrowserSub") } else { t("signInSub") };
    let image = if done { app.icon("check") } else if mfa { app.icon("shield") } else { crate::assets::logo() };
    let mut out = vec![B { kind: "logo", image, title, sub, on: done, tone: if mfa { "icon" } else { "" }, ..Default::default() }];
    if !mfa && !waiting {
        out.push(B { extra: "wide", ..seg(&[("password", &t("tabPassword")), ("otp", &t("tabEmailCode"))], if otp { "otp" } else { "password" }, "login:tab:") });
    }
    if let Some(error) = error {
        out.push(error_block(&error));
    }
    if waiting {
        let spinner = app.icon("refresh-cw");
        out.push(B { kind: "spinner", icon: spinner, ..Default::default() });
        out.push(row(vec![btn("login:cancel", &t("cancel")).grow()]));
    } else {
        if mfa {
            let key_icon = app.icon("key-round");
            out.push(field(&t(if use_backup { "backupCode" } else { "code" }), vec![input("login:code", &code, "").icon(key_icon).focus().tip(&t("code"))]));
        } else if otp_sent {
            out.push(note(&tv("codeSent", &[("email", &email)])));
            let key_icon = app.icon("key-round");
            out.push(field(&t("code"), vec![input("login:code", &code, "").icon(key_icon).focus().tip(&t("code"))]));
        } else {
            let mail_icon = app.icon("mail");
            out.push(field(&t("email"), vec![input("login:email", &email, &t("emailPlaceholder")).icon(mail_icon).off(busy || done).focus().tip(&t("email"))]));
        }
        if !mfa && !otp {
            let lock = app.icon("lock");
            let eye = app.icon(if show { "eye-off" } else { "eye" });
            let mut cell = input("login:password", &password, "").icon(lock).off(busy || done).tip(&t("password"));
            cell.on = !show;
            out.push(field(&t("password"), vec![cell, ibtn("login:reveal", eye, &t("togglePassword"))]));
        }
        if !mfa {
            let mut cells = vec![switch("login:remember", !forget, &t("remember")), text(&t("remember")), gap()];
            if !otp {
                cells.push(link("login:site:recovery", &t("forgot")));
            }
            if otp_sent {
                cells.push(link("login:change-email", &t("changeEmail")));
            }
            out.push(row(cells));
        }
        let label = if done { t("signedIn") } else if busy { if otp && !otp_sent && !mfa { t("sending") } else if !otp && !mfa { t("signingIn") } else { t("verifying") } } else if mfa || otp_sent { t("verify") } else if otp { t("sendCode") } else { t("signIn") };
        out.push(row(vec![primary("login:submit", &label).grow().off(busy || done)]));
        if mfa {
            out.push(row(vec![link("login:backup", &t(if use_backup { "mfaApp" } else { "mfaBackup" })), gap(), link("login:sign-out", &t("signOut"))]));
        }
    }
    if !mfa && !waiting {
        out.push(row(vec![muted(&t("orWord")).center().grow()]));
        let google = app.icon("provider-google");
        let github = app.icon("provider-github");
        let discord = app.icon("provider-discord");
        out.push(row(vec![
            btn("login:provider:google", "Google").icon(google).grow().off(busy || done),
            btn("login:provider:github", "GitHub").icon(github).grow().off(busy || done),
            btn("login:provider:discord", "Discord").icon(discord).grow().off(busy || done),
        ]));
    }
    out.push(row(vec![link("login:site:register", &t("createAccount")).on(true), gap(), link("login:site:terms", &t("terms")).tone("muted"), link("login:site:privacy", &t("privacy")).tone("muted")]));
    out.push(row(vec![link("login:language", if lang() == "fr" { "Français" } else { "English" }).tone("muted")]));
    out
}

fn error_block(text: &str) -> B {
    error(text, vec![])
}

