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
        view.backgroundColor = .white
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
        <style>
        html,body{margin:0;padding:0;background:#fff;color:#111;-webkit-text-size-adjust:100%}
        body{padding:14px;font:-apple-system-body;word-wrap:break-word;overflow-wrap:anywhere}
        img{max-width:100%!important;height:auto!important}
        table{max-width:100%!important}
        td,th{word-break:break-word}
        pre{white-space:pre-wrap}
        a{color:#6D28D9}
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
