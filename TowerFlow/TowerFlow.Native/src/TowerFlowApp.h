#pragma once

#include <windows.h>
#include "WebViewHost.h"

class TowerFlowApp {
public:
    int Run(HINSTANCE instance, int showCommand);

private:
    static LRESULT CALLBACK WindowProc(
        HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam);

    LRESULT HandleMessage(UINT message, WPARAM wParam, LPARAM lParam);

    HWND hwnd_ = nullptr;
    WebViewHost webView_;
};
