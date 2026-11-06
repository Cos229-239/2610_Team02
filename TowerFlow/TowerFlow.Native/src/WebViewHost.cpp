#include "WebViewHost.h"

#include <filesystem>
#include <string>
#include <vector>
#include <cstdlib>
#include <shlwapi.h>
#include <wrl.h>

using Microsoft::WRL::Callback;

HRESULT WebViewHost::Initialize(HWND hwnd) {
    hwnd_ = hwnd;

    wchar_t* localAppData = nullptr;
    size_t envSize = 0;
    std::wstring dataPath;

    if (_wdupenv_s(&localAppData, &envSize, L"LOCALAPPDATA") == 0 &&
        localAppData != nullptr) {
        dataPath = localAppData;
        free(localAppData);
    } else {
        dataPath = L".";
    }

    dataPath += L"\\TowerFlow\\WebView2Data";

    std::error_code ec;
    std::filesystem::create_directories(dataPath, ec);

    if (ec) {
        MessageBoxW(hwnd_, L"Could not create TowerFlow's local browser-data directory.",
                    L"TowerFlow", MB_ICONERROR);
        return HRESULT_FROM_WIN32(ec.value());
    }

    return CreateCoreWebView2EnvironmentWithOptions(
        nullptr,
        dataPath.c_str(),
        nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [this](HRESULT result, ICoreWebView2Environment* environment) -> HRESULT {
                if (FAILED(result) || !environment) {
                    MessageBoxW(hwnd_,
                        L"WebView2 could not initialize. Check the installed runtime.",
                        L"TowerFlow startup error", MB_ICONERROR);
                    return S_OK;
                }

                return environment->CreateCoreWebView2Controller(
                    hwnd_,
                    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [this](HRESULT controllerResult,
                               ICoreWebView2Controller* controller) -> HRESULT {
                            if (FAILED(controllerResult) || !controller) {
                                MessageBoxW(hwnd_,
                                    L"Could not create the TowerFlow browser control.",
                                    L"TowerFlow startup error", MB_ICONERROR);
                                return S_OK;
                            }

                            controller_ = controller;

                            HRESULT hr = controller_->get_CoreWebView2(
                                webview_.GetAddressOf());

                            if (FAILED(hr)) {
                                return hr;
                            }

                            controller_->put_IsVisible(TRUE);
                            Resize();

                            return NavigateToTowerFlow();
                        }).Get());
            }).Get());
}

void WebViewHost::Resize() {
    if (!hwnd_ || !controller_) return;

    RECT bounds{};
    GetClientRect(hwnd_, &bounds);
    controller_->put_Bounds(bounds);
}

HRESULT WebViewHost::NavigateToTowerFlow() {
    if (!webview_) return E_POINTER;

    wchar_t executable[MAX_PATH]{};
    GetModuleFileNameW(nullptr, executable, MAX_PATH);

    std::filesystem::path current =
        std::filesystem::path(executable).parent_path();

    std::filesystem::path indexPath;

    for (int i = 0; i < 8 && !current.empty(); ++i) {
        if (std::filesystem::exists(current / L"index.html")) {
            indexPath = current / L"index.html";
            break;
        }

        auto parent = current.parent_path();
        if (parent == current) break;
        current = parent;
    }

    if (indexPath.empty()) {
        MessageBoxW(hwnd_,
            L"TowerFlow's index.html could not be found. "
            L"The original application files must remain in the project root.",
            L"TowerFlow startup error", MB_ICONERROR);
        return HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND);
    }

    std::vector<wchar_t> url(32768);
    DWORD urlLength = static_cast<DWORD>(url.size());

    HRESULT hr = UrlCreateFromPathW(
        indexPath.c_str(), url.data(), &urlLength, 0);

    if (FAILED(hr)) return hr;

    return webview_->Navigate(url.data());
}
