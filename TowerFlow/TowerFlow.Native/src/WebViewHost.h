#pragma once

#include <windows.h>
#include <wrl.h>
#include <WebView2.h>

class WebViewHost {
public:
    HRESULT Initialize(HWND hwnd);
    void Resize();

private:
    HRESULT NavigateToTowerFlow();

    HWND hwnd_ = nullptr;
    Microsoft::WRL::ComPtr<ICoreWebView2Controller> controller_;
    Microsoft::WRL::ComPtr<ICoreWebView2> webview_;
};
