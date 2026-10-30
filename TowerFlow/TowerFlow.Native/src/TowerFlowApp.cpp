#include "TowerFlowApp.h"

#include <objbase.h>

int TowerFlowApp::Run(HINSTANCE instance, int showCommand) {
    HRESULT comResult = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

    if (FAILED(comResult)) {
        MessageBoxW(nullptr, L"Could not initialize Windows COM services.",
                    L"TowerFlow", MB_ICONERROR);
        return 1;
    }

    const wchar_t* className = L"TowerFlowNativeWindow";

    WNDCLASSEXW wc{};
    wc.cbSize = sizeof(wc);
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = instance;
    wc.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    wc.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
    wc.lpszClassName = className;

    if (!RegisterClassExW(&wc)) {
        CoUninitialize();
        return 2;
    }

    hwnd_ = CreateWindowExW(
        0, className, L"TowerFlow | Portfolio Command",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 1440, 940,
        nullptr, nullptr, instance, this);

    if (!hwnd_) {
        CoUninitialize();
        return 3;
    }

    ShowWindow(hwnd_, showCommand);
    UpdateWindow(hwnd_);

    MSG message{};
    while (GetMessageW(&message, nullptr, 0, 0) > 0) {
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }

    CoUninitialize();
    return static_cast<int>(message.wParam);
}

LRESULT CALLBACK TowerFlowApp::WindowProc(
    HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) {

    TowerFlowApp* app = reinterpret_cast<TowerFlowApp*>(
        GetWindowLongPtrW(hwnd, GWLP_USERDATA));

    if (message == WM_NCCREATE) {
        auto create = reinterpret_cast<CREATESTRUCTW*>(lParam);
        app = static_cast<TowerFlowApp*>(create->lpCreateParams);

        if (app) {
            app->hwnd_ = hwnd;
            SetWindowLongPtrW(hwnd, GWLP_USERDATA,
                              reinterpret_cast<LONG_PTR>(app));
        }
    }

    if (app) return app->HandleMessage(message, wParam, lParam);
    return DefWindowProcW(hwnd, message, wParam, lParam);
}

LRESULT TowerFlowApp::HandleMessage(
    UINT message, WPARAM wParam, LPARAM lParam) {

    switch (message) {
    case WM_CREATE: {
        HRESULT hr = webView_.Initialize(hwnd_);
        if (FAILED(hr)) {
            MessageBoxW(hwnd_,
                L"WebView2 initialization could not be started.",
                L"TowerFlow", MB_ICONERROR);
        }
        return 0;
    }

    case WM_SIZE:
        webView_.Resize();
        return 0;

    case WM_CLOSE:
        DestroyWindow(hwnd_);
        return 0;

    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;

    default:
        return DefWindowProcW(hwnd_, message, wParam, lParam);
    }
}
