fn main() {
    let config = slint_build::CompilerConfiguration::new().with_debug_info(std::env::var_os("CARGO_FEATURE_E2E").is_some());
    slint_build::compile_with_config("ui/app.slint", config).expect("slint");
    println!("cargo:rerun-if-changed=ethone.rc");
    println!("cargo:rerun-if-changed=assets/ethone.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let icon = root.join("assets").join("ethone.ico").display().to_string().replace('\\', "/");
    let template = std::fs::read_to_string(root.join("ethone.rc")).expect("ethone.rc");
    let filled = template
        .replace("{ICON}", &icon)
        .replace("{MAJOR}", env!("CARGO_PKG_VERSION_MAJOR"))
        .replace("{MINOR}", env!("CARGO_PKG_VERSION_MINOR"))
        .replace("{PATCH}", env!("CARGO_PKG_VERSION_PATCH"))
        .replace("{VERSION}", env!("CARGO_PKG_VERSION"));
    let out = std::path::PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR")).join("ethone.rc");
    std::fs::write(&out, filled).expect("ressources");
    embed_resource::compile(&out, embed_resource::NONE).manifest_optional().expect("ressources Windows");
}
