import SwiftUI
import WebKit

/// Renders an email's HTML like Mail does: images and layout kept, scripts off, links opened in Safari.
struct MailHTMLView: UIViewRepresentable {
    let html: String
    @Binding var height: CGFloat

    func makeCoordinator() -> Coordinator { Coordinator(height: $height) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = false
        configuration.dataDetectorTypes = [.link, .phoneNumber, .address]
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.scrollView.bounces = false
        context.coordinator.observe(view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        guard context.coordinator.loaded != html else { return }
        context.coordinator.loaded = html
        view.loadHTMLString(Self.document(html), baseURL: nil)
    }

    static func document(_ html: String) -> String {
        """
        <!doctype html><html><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <meta name="color-scheme" content="dark">
        <style>
        :root { color-scheme: dark; }
        html, body {
            margin: 0;
            padding: 16px;
            background: #0E1017 !important;
            color: #F1F5F9 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-text-size-adjust: 100%;
            word-wrap: break-word;
            overflow-wrap: anywhere;
        }
        p, span, div, td, th, table, b, strong, i, em, h1, h2, h3, h4, h5, h6 {
            color: inherit;
        }
        /* Invert inline white/light backgrounds in rich emails */
        [style*="background-color: rgb(255, 255, 255)"],
        [style*="background-color: #fff"],
        [style*="background-color: #ffffff"],
        [style*="background-color: white"],
        [style*="background: rgb(255, 255, 255)"],
        [style*="background: #fff"],
        [style*="background: #ffffff"],
        [style*="background: white"],
        [bgcolor="#ffffff"], [bgcolor="#fff"], [bgcolor="white"] {
            background-color: #141722 !important;
            background: #141722 !important;
        }
        /* Invert dark/black text from inline styles to bright text */
        [style*="color: rgb(0, 0, 0)"],
        [style*="color: #000"], [style*="color: #000000"],
        [style*="color: #111"], [style*="color: #222"], [style*="color: #333"],
        [style*="color: #444"], [style*="color: #555"] {
            color: #F1F5F9 !important;
        }
        img { max-width: 100% !important; height: auto !important; border-radius: 8px; }
        table { max-width: 100% !important; }
        td, th { word-break: break-word; }
        pre, code {
            white-space: pre-wrap;
            background: rgba(255, 255, 255, 0.08);
            padding: 8px 12px;
            border-radius: 8px;
            color: #F1F5F9;
        }
        a { color: #A78BFA !important; }
        </style></head><body>\(html)</body></html>
        """
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var loaded: String?
        private var height: Binding<CGFloat>
        private var observation: NSKeyValueObservation?

        init(height: Binding<CGFloat>) { self.height = height }

        func observe(_ view: WKWebView) {
            observation = view.scrollView.observe(\.contentSize, options: [.new]) { [weak self] scroll, _ in
                let value = max(60, scroll.contentSize.height)
                DispatchQueue.main.async {
                    if abs((self?.height.wrappedValue ?? 0) - value) > 1 { self?.height.wrappedValue = value }
                }
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
            if action.navigationType == .linkActivated, let url = action.request.url {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}
