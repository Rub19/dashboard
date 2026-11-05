use crate::app::App;
use crate::i18n::tr;
use crate::vm::*;
use serde_json::Value;

pub fn tab_list() -> Vec<(&'static str, String)> {
    vec![("profile", tr("Profil", "Profile")), ("live", tr("En direct", "Live")), ("game", tr("Jeu", "Game")), ("hub", "Hub".to_string())]
}

pub fn filters(app: &mut App, prefix: &str, modes: &[String], picks: &[String], pick_label: &str, result: &str, mode: &str, pick: &str) -> Vec<C> {
    let result = if result.is_empty() { "all" } else { result };
    let mut cells: Vec<C> = [("all", tr("Toutes", "All")), ("win", tr("Victoires", "Wins")), ("loss", tr("Défaites", "Losses"))].into_iter().map(|(id, label)| chip(&format!("{prefix}:filter-result:{id}"), &label).on(result == id)).collect();
    let mut mode_options = vec![(String::new(), tr("Tous les modes", "All modes"))];
    mode_options.extend(modes.iter().map(|item| (item.clone(), item.clone())));
    cells.push(app.select(&format!("{prefix}:filter-mode"), mode, &mode_options));
    let mut pick_options = vec![(String::new(), pick_label.to_string())];
    pick_options.extend(picks.iter().map(|item| (item.clone(), item.clone())));
    cells.push(app.select(&format!("{prefix}:filter-pick"), pick, &pick_options));
    if result != "all" || !mode.is_empty() || !pick.is_empty() {
        cells.push(link(&format!("{prefix}:filter-clear"), &tr("Tout afficher", "Show all")));
    }
    cells.push(gap());
    cells
}

pub fn view(app: &mut App, tab: &str, data: &Value) -> (Vec<B>, Vec<B>) {
    let linked = data["linked"] == true;
    match tab {
        "live" => (crate::pages::eval_game::live_view(app, linked), Vec::new()),
        "game" => (crate::pages::eval_game::game_view(app, linked), crate::pages::eval_game::game_side(app, linked)),
        "hub" => (crate::pages::eval_hub::view(app, linked, &data["account"]), Vec::new()),
        _ => (Vec::new(), Vec::new()),
    }
}

pub fn act(app: &mut App, verb: &str, arg: &str, value: &str) {
    if !crate::pages::eval_hub::act(app, verb, arg, value) {
        crate::pages::eval_game::act(app, verb, arg, value);
    }
}
