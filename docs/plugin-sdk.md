# ETHONE Plugin SDK

`ETHONEPluginSDK` lets a plugin extend ETHONE without changing backend code.

It can register:

- Pages
- Widgets
- Brain commands
- Keyboard shortcuts
- AI providers
- Integrations

## Minimal Plugin

```js
ETHONEPluginSDK.register({
  id: "demo-plugin",
  name: "Demo Plugin",
  version: "1.0.0",
  author: "Community",
  description: "A complete local plugin example.",
  permissions: ["Runs locally inside ETHONE"],

  pages: [{
    id: "home",
    title: "Demo Page",
    html: "<section class='plugin-sdk-empty'><span>Demo</span><strong>Hello ETHONE</strong><p>This page was added by a plugin.</p></section>"
  }],

  widgets: [{
    id: "status",
    title: "Demo Status",
    icon: "sparkles",
    defaultSize: { col: 2, row: 1 },
    render() {
      return "<div class='wm-community-widget'><span>Plugin</span><strong>Demo Status</strong><p>Widget registered through the SDK.</p></div>";
    }
  }],

  brainCommands: [{
    id: "summarize-demo",
    label: "Summarize Demo Context",
    description: "Ask Brain to summarize this plugin context.",
    prompt: "Summarize the current Demo Plugin context and suggest one next action."
  }],

  shortcuts: [{
    id: "open-demo",
    label: "Open Demo Page",
    shortcut: "Ctrl+Alt+M",
    action: "plugin.demo-plugin.page.home.open"
  }],

  providers: [{
    id: "demo-openai-compatible",
    name: "Demo OpenAI Compatible",
    kind: "cloud",
    modelMode: "openai",
    baseUrl: "https://example.com/v1",
    modelsPath: "/models",
    chatPath: "/chat/completions",
    features: ["plugin", "openai-compatible"]
  }],

  integrations: [{
    id: "demo-service",
    name: "Demo Service",
    icon: "plug",
    fields: [["account", "Account", "you@example.com"]],
    preview: ["Status", "Sync", "Data"],
    placeholder: "Connect the production API later. ETHONE stores local settings now."
  }]
});
```

## Direct APIs

```js
ETHONEPluginSDK.page(pluginId, page);
ETHONEPluginSDK.widget(pluginId, widget);
ETHONEPluginSDK.brainCommand(pluginId, command);
ETHONEPluginSDK.shortcut(pluginId, shortcut);
ETHONEPluginSDK.provider(pluginId, provider);
ETHONEPluginSDK.integration(pluginId, integration);
```

Use `ETHONEPluginSDK.list()` to inspect registered extensions.
