import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        
        let configuration = WKWebViewConfiguration()
        
        // Enable local file access in WKWebView
        configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        configuration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // Setup WKWebView preferences
        let webPreferences = WKPreferences()
        webPreferences.javaScriptEnabled = true
        webPreferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.preferences = webPreferences

        webView = WKWebView(frame: self.view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        // Disable bounce scrolling for a more native app feel
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        self.view.addSubview(webView)
        
        // Load the local HTML bundle
        loadLocalWebAssets()
    }
    
    private func loadLocalWebAssets() {
        guard let assetPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "assets") else {
            print("Error: index.html not found in assets bundle.")
            return
        }
        
        let fileURL = URL(fileURLWithPath: assetPath)
        let directoryURL = fileURL.deletingLastPathComponent()
        
        webView.loadFileURL(fileURL, allowingReadAccessTo: directoryURL)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
