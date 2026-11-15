#define UNICODE
#define _UNICODE
#define NOMINMAX
#include <windows.h>
#include <commctrl.h>
#include <algorithm>
#include <cwctype>
#include <string>
#include <vector>
#include <utility>
#include "TowerFlowGUI.h"
#include "OperationsInventory.h"

namespace {
constexpr int SearchId = 100;
constexpr int ViewId = 101;

std::wstring widen(const std::string& text) {
    if (text.empty()) return {};
    UINT encoding = CP_UTF8;
    int size = MultiByteToWideChar(encoding, MB_ERR_INVALID_CHARS, text.data(), static_cast<int>(text.size()), nullptr, 0);
    if (!size) {
        encoding = CP_ACP;
        size = MultiByteToWideChar(encoding, 0, text.data(), static_cast<int>(text.size()), nullptr, 0);
    }
    std::wstring result(size, L' ');
    if (size) MultiByteToWideChar(encoding, 0, text.data(), static_cast<int>(text.size()), result.data(), size);
    return result;
}

using Row = std::vector<std::wstring>;
struct InventoryTable {
    const wchar_t* name;
    std::vector<const wchar_t*> columns;
    std::vector<Row> rows;
};

std::wstring money(long long cents) {
    const auto remainder = cents % 100;
    return L"$" + std::to_wstring(cents / 100) + L"." +
        (remainder < 10 ? L"0" : L"") + std::to_wstring(remainder);
}

InventoryTable transactions(const wchar_t* name, const wchar_t* contact,
                            const std::vector<towerflow::StockTransaction>& records) {
    InventoryTable result{name, {L"ID", contact, L"Part ID", L"Part name", L"Quantity", L"Unit price", L"Total"}, {}};
    for (const auto& record : records) {
        result.rows.push_back({std::to_wstring(record.id), widen(record.contact),
            widen(record.line.partId), widen(record.line.partName), std::to_wstring(record.line.quantity),
            money(record.unitCents), money(record.totalCents())});
    }
    return result;
}

std::wstring lowercase(std::wstring text) {
    for (auto& ch : text) ch = static_cast<wchar_t>(std::towlower(ch));
    return text;
}

struct InventoryWindow {
    std::vector<InventoryTable> tables;
    HWND selector = nullptr;
    HWND label = nullptr;
    HWND search = nullptr;
    HWND table = nullptr;
    HWND status = nullptr;
    bool closed = false;

    const InventoryTable& selectedTable() const {
        const auto selection = SendMessage(selector, CB_GETCURSEL, 0, 0);
        return tables[selection == CB_ERR ? 0 : static_cast<std::size_t>(selection)];
    }

    void updateColumns() const {
        while (ListView_DeleteColumn(table, 0)) {}
        const auto& columns = selectedTable().columns;
        for (std::size_t index = 0; index < columns.size(); ++index) {
            LVCOLUMN column{};
            column.mask = LVCF_TEXT | LVCF_WIDTH;
            column.pszText = const_cast<wchar_t*>(columns[index]);
            column.cx = 105;
            if (std::wstring(columns[index]) == L"ID") column.cx = 55;
            if (std::wstring(columns[index]) == L"Description" || std::wstring(columns[index]) == L"Part name") column.cx = 170;
            if (std::wstring(columns[index]) == L"Serial number") column.cx = 185;
            ListView_InsertColumn(table, static_cast<int>(index), &column);
        }
        refresh();
    }

    void refresh() const {
        wchar_t query[256]{};
        GetWindowText(search, query, 256);
        const auto filter = lowercase(query);
        const auto& rows = selectedTable().rows;
        SendMessage(table, WM_SETREDRAW, FALSE, 0);
        ListView_DeleteAllItems(table);
        int count = 0;
        for (const auto& cells : rows) {
            const auto matches = [&](const std::wstring& value) {
                return lowercase(value).find(filter) != std::wstring::npos;
            };
            if (!filter.empty() && std::none_of(cells.begin(), cells.end(), matches)) continue;
            LVITEM item{};
            item.mask = LVIF_TEXT;
            item.iItem = count;
            item.pszText = const_cast<wchar_t*>(cells.front().c_str());
            const int row = ListView_InsertItem(table, &item);
            if (row < 0) break;
            for (std::size_t column = 1; column < cells.size(); ++column) {
                ListView_SetItemText(table, row, static_cast<int>(column),
                    const_cast<wchar_t*>(cells[column].c_str()));
            }
            ++count;
        }
        SendMessage(table, WM_SETREDRAW, TRUE, 0);
        InvalidateRect(table, nullptr, TRUE);
        const auto message = std::to_wstring(count) + L" of " + std::to_wstring(rows.size()) + L" records";
        SetWindowText(status, message.c_str());
    }
};

LRESULT CALLBACK windowProc(HWND window, UINT message, WPARAM wParam, LPARAM lParam) {
    if (message == WM_NCCREATE) {
        const auto* setup = reinterpret_cast<CREATESTRUCT*>(lParam);
        SetWindowLongPtr(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(setup->lpCreateParams));
    }
    auto* view = reinterpret_cast<InventoryWindow*>(GetWindowLongPtr(window, GWLP_USERDATA));
    switch (message) {
    case WM_CREATE: {
        const auto control = [window](const wchar_t* type, const wchar_t* title, DWORD style, int id = 0) {
            HWND child = CreateWindowEx(0, type, title, WS_CHILD | WS_VISIBLE | style,
                0, 0, 0, 0, window, reinterpret_cast<HMENU>(static_cast<INT_PTR>(id)), nullptr, nullptr);
            if (child) SendMessage(child, WM_SETFONT, reinterpret_cast<WPARAM>(GetStockObject(DEFAULT_GUI_FONT)), TRUE);
            return child;
        };
        view->selector = control(L"COMBOBOX", L"", WS_TABSTOP | CBS_DROPDOWNLIST, ViewId);
        view->label = control(L"STATIC", L"Search the selected view", 0);
        view->search = control(L"EDIT", L"", WS_TABSTOP | WS_BORDER | ES_AUTOHSCROLL, SearchId);
        view->table = control(WC_LISTVIEW, L"", WS_TABSTOP | WS_BORDER | LVS_REPORT | LVS_SINGLESEL);
        view->status = control(L"STATIC", L"", 0);
        if (!view->selector || !view->label || !view->search || !view->table || !view->status) return -1;
        SendMessage(view->search, EM_SETLIMITTEXT, 255, 0);
        ListView_SetExtendedListViewStyle(view->table, LVS_EX_FULLROWSELECT | LVS_EX_DOUBLEBUFFER);
        for (const auto& entry : view->tables) {
            SendMessage(view->selector, CB_ADDSTRING, 0, reinterpret_cast<LPARAM>(entry.name));
        }
        SendMessage(view->selector, CB_SETCURSEL, 0, 0);
        view->updateColumns();
        return 0;
    }
    case WM_SIZE:
        if (view && view->table && wParam != SIZE_MINIMIZED) {
            const int width = std::max(0, LOWORD(lParam) - 32);
            const int height = static_cast<int>(HIWORD(lParam));
            MoveWindow(view->selector, 16, 14, std::min(width, 240), 230, TRUE);
            MoveWindow(view->label, 16, 50, width, 20, TRUE);
            MoveWindow(view->search, 16, 74, width, 25, TRUE);
            MoveWindow(view->table, 16, 110, width, std::max(0, height - 148), TRUE);
            MoveWindow(view->status, 16, std::max(110, height - 28), width, 20, TRUE);
        }
        return 0;
    case WM_COMMAND:
        if (view && view->table && LOWORD(wParam) == ViewId && HIWORD(wParam) == CBN_SELCHANGE) view->updateColumns();
        if (view && view->table && LOWORD(wParam) == SearchId && HIWORD(wParam) == EN_CHANGE) view->refresh();
        return 0;
    case WM_DESTROY:
        if (view) view->closed = true;
        return 0;
    }
    return DefWindowProc(window, message, wParam, lParam);
}
}

void ShowInventoryWindow(const towerflow::OperationsInventory& inventory) {
    InventoryWindow view;
    InventoryTable parts{L"Parts and Bulks", {L"Part name", L"Part ID", L"Serial number", L"Quantity"}, {}};
    for (const auto& part : inventory.parts()) {
        parts.rows.push_back({widen(part.Name), widen(part.PartId), widen(part.SerialNumber),
            std::to_wstring(part.Quantity)});
    }
    InventoryTable folders{L"Work Folders", {L"ID", L"Description", L"Part ID", L"Part name", L"Quantity"}, {}};
    for (const auto& folder : inventory.workOrders()) {
        folders.rows.push_back({std::to_wstring(folder.id), widen(folder.description),
            widen(folder.line.partId), widen(folder.line.partName), std::to_wstring(folder.line.quantity)});
    }
    view.tables = {std::move(parts), std::move(folders),
        transactions(L"Purchased Parts", L"Supplier", inventory.receipts()),
        transactions(L"Purchase Orders", L"Supplier", inventory.purchaseOrders()),
        transactions(L"Sales", L"Customer", inventory.sales())};
    const auto instance = GetModuleHandle(nullptr);
    INITCOMMONCONTROLSEX controls{sizeof(controls), ICC_LISTVIEW_CLASSES};
    if (!InitCommonControlsEx(&controls)) return;
    WNDCLASS type{};
    type.lpfnWndProc = windowProc;
    type.hInstance = instance;
    type.hCursor = LoadCursor(nullptr, IDC_ARROW);
    type.hbrBackground = GetSysColorBrush(COLOR_WINDOW);
    type.lpszClassName = L"TowerFlowInventory";
    if (!RegisterClass(&type) && GetLastError() != ERROR_CLASS_ALREADY_EXISTS) return;
    HWND window = CreateWindowEx(0, type.lpszClassName, L"TowerFlow Inventory",
        WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 940, 480, nullptr, nullptr, instance, &view);
    if (!window) return;
    ShowWindow(window, SW_SHOW);
    SetFocus(view.search);
    MSG message{};
    BOOL result;
    while (!view.closed && (result = GetMessage(&message, nullptr, 0, 0)) > 0) {
        if (!IsDialogMessage(window, &message)) {
            TranslateMessage(&message);
            DispatchMessage(&message);
        }
    }
}

