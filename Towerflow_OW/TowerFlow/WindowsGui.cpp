#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include "WindowsGui.h"
#include "BusinessIdentity.h"
#include "FileStorage.h"
#include "Inventory.h"
#include "Report.h"
#include <windows.h>
#include <commctrl.h>
#include <commdlg.h>
#include <shellapi.h>
#include <algorithm>
#include <charconv>
#include <cstdint>
#include <ctime>
#include <cwctype>
#include <filesystem>
#include <iterator>
#include <memory>
#include <optional>
#include <string>
#include <system_error>
#include <unordered_set>

#if defined(_MSC_VER)
#pragma comment(linker, "/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")
#endif

namespace {
namespace fs = std::filesystem;

constexpr COLORREF canvas = RGB(244, 247, 250);
constexpr COLORREF ink = RGB(24, 44, 64);
constexpr COLORREF muted = RGB(91, 108, 124);
constexpr COLORREF navy = RGB(18, 42, 61);
constexpr COLORREF accent = RGB(0, 116, 109);
constexpr COLORREF warning = RGB(172, 67, 42);

enum Command : int {
    NewInventory = 201, OpenInventory, ExportHtml, BusinessName, Exit,
    AddProduct, EditProduct, SetQr, StockAction,
    ShowProducts, ShowActivity, ClearSearch,
    SearchField = 300, ProductTable, ActivityTable, StockTable,
    ActionField = 400, FirstField = 410
};

std::wstring wide(const std::string& text) {
    if (text.empty()) return {};
    int length = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text.data(),
        static_cast<int>(text.size()), nullptr, 0);
    UINT encoding = CP_UTF8;
    DWORD flags = MB_ERR_INVALID_CHARS;
    if (!length) {
        encoding = CP_ACP;
        flags = 0;
        length = MultiByteToWideChar(encoding, flags, text.data(),
            static_cast<int>(text.size()), nullptr, 0);
    }
    std::wstring result(length, L'\0');
    if (length) MultiByteToWideChar(encoding, flags, text.data(),
        static_cast<int>(text.size()), result.data(), length);
    return result;
}

std::string utf8(const std::wstring& text) {
    if (text.empty()) return {};
    const int length = WideCharToMultiByte(CP_UTF8, 0, text.data(),
        static_cast<int>(text.size()), nullptr, 0, nullptr, nullptr);
    std::string result(length, '\0');
    if (length) WideCharToMultiByte(CP_UTF8, 0, text.data(),
        static_cast<int>(text.size()), result.data(), length, nullptr, nullptr);
    return result;
}

std::wstring textOf(HWND control) {
    const int length = GetWindowTextLengthW(control);
    std::wstring value(length + 1, L'\0');
    GetWindowTextW(control, value.data(), length + 1);
    value.resize(length);
    return value;
}

std::wstring trimmed(std::wstring value) {
    const auto first = std::find_if_not(value.begin(), value.end(), [](wchar_t ch) {
        return std::iswspace(ch) != 0;
    });
    const auto last = std::find_if_not(value.rbegin(), value.rend(), [](wchar_t ch) {
        return std::iswspace(ch) != 0;
    }).base();
    if (first >= last) return {};
    return std::wstring(first, last);
}

std::wstring dollars(std::int64_t cents) {
    auto result = std::to_wstring(cents / 100) + L'.';
    if (cents % 100 < 10) result += L'0';
    return result + std::to_wstring(cents % 100);
}

bool wholeNumber(const std::wstring& input, int minimum, int& value) {
    const std::string digits = utf8(input);
    if (digits.empty()) return false;
    const auto parsed = std::from_chars(digits.data(), digits.data() + digits.size(), value);
    return parsed.ec == std::errc{} && parsed.ptr == digits.data() + digits.size()
        && value >= minimum;
}

bool priceInCents(const std::wstring& input, std::int64_t& value) {
    if (input.empty()) return false;
    const auto dot = input.find(L'.');
    if (dot != std::wstring::npos && input.find(L'.', dot + 1) != std::wstring::npos)
        return false;
    const auto whole = input.substr(0, dot);
    const auto fraction = dot == std::wstring::npos ? L"" : input.substr(dot + 1);
    if (whole.empty() || fraction.size() > 2) return false;
    const auto digits = [](const std::wstring& part) {
        return std::all_of(part.begin(), part.end(), [](wchar_t ch) {
            return ch >= L'0' && ch <= L'9';
        });
    };
    if (!digits(whole) || !digits(fraction)) return false;
    const auto bytes = utf8(whole);
    std::int64_t integer = 0;
    const auto parsed = std::from_chars(bytes.data(), bytes.data() + bytes.size(), integer);
    if (parsed.ec != std::errc{} || parsed.ptr != bytes.data() + bytes.size() ||
        integer > Inventory::maxPriceCents / 100) return false;
    value = integer * 100;
    if (!fraction.empty()) value += (fraction[0] - L'0') * 10;
    if (fraction.size() == 2) value += fraction[1] - L'0';
    return value <= Inventory::maxPriceCents;
}

std::wstring timeUtc(std::int64_t timestamp) {
    const auto seconds = static_cast<std::time_t>(timestamp);
    std::tm calendar{};
    if (gmtime_s(&calendar, &seconds) != 0) return L"Unknown";
    wchar_t result[32]{};
    swprintf_s(result, std::size(result), L"%04d-%02d-%02d %02d:%02d UTC",
        calendar.tm_year + 1900, calendar.tm_mon + 1, calendar.tm_mday,
        calendar.tm_hour, calendar.tm_min);
    return result;
}

void errorBox(HWND parent, const std::wstring& message) {
    MessageBoxW(parent, message.c_str(), L"TowerFlow", MB_OK | MB_ICONERROR);
}

void setFont(HWND control, HFONT font) {
    SendMessageW(control, WM_SETFONT, reinterpret_cast<WPARAM>(font), TRUE);
}

HWND control(HWND parent, const wchar_t* kind, const wchar_t* title,
    DWORD style, int id, DWORD extra = 0) {
    return CreateWindowExW(extra, kind, title, WS_CHILD | WS_VISIBLE | style,
        0, 0, 0, 0, parent, reinterpret_cast<HMENU>(static_cast<INT_PTR>(id)),
        GetModuleHandleW(nullptr), nullptr);
}

// Owner-drawn buttons share one visual system across the toolbar and forms.
void drawButton(const DRAWITEMSTRUCT& item, bool primary = false,
    bool tab = false, bool active = false) {
    HDC dc = item.hDC;
    RECT bounds = item.rcItem;
    const bool disabled = (item.itemState & ODS_DISABLED) != 0;
    const bool pressed = (item.itemState & ODS_SELECTED) != 0;
    const bool header = item.CtlID == OpenInventory || item.CtlID == BusinessName;
    const COLORREF background = tab ? canvas : header ? RGB(37, 69, 88)
        : primary ? pressed ? RGB(0, 87, 81) : accent
        : pressed ? RGB(231, 239, 243) : RGB(255, 255, 255);
    const COLORREF foreground = disabled ? RGB(156, 169, 180)
        : header || primary ? RGB(255, 255, 255)
        : tab && active ? accent : ink;
    HBRUSH fill = CreateSolidBrush(background);
    HPEN outline = CreatePen(PS_SOLID, 1, header ? RGB(91, 131, 148)
        : primary ? background : RGB(213, 223, 231));
    HGDIOBJ oldBrush = SelectObject(dc, fill);
    HGDIOBJ oldPen = SelectObject(dc, outline);
    if (tab) {
        FillRect(dc, &bounds, fill);
        if (active) {
            RECT rule{ bounds.left + 8, bounds.bottom - 3, bounds.right - 8, bounds.bottom };
            HBRUSH highlight = CreateSolidBrush(accent);
            FillRect(dc, &rule, highlight);
            DeleteObject(highlight);
        }
    }
    else RoundRect(dc, bounds.left, bounds.top, bounds.right, bounds.bottom, 10, 10);
    SelectObject(dc, oldBrush);
    SelectObject(dc, oldPen);
    DeleteObject(fill);
    DeleteObject(outline);

    wchar_t title[128]{};
    GetWindowTextW(item.hwndItem, title, std::size(title));
    HGDIOBJ font = SelectObject(dc,
        reinterpret_cast<HFONT>(SendMessageW(item.hwndItem, WM_GETFONT, 0, 0)));
    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, foreground);
    RECT content = bounds;
    DrawTextW(dc, title, -1, &content, DT_SINGLELINE | DT_CENTER | DT_VCENTER | DT_END_ELLIPSIS);
    SelectObject(dc, font);
    if (item.itemState & ODS_FOCUS) {
        RECT focus = bounds;
        InflateRect(&focus, -5, -5);
        DrawFocusRect(dc, &focus);
    }
}

void addColumn(HWND table, int index, const wchar_t* title, int width) {
    LVCOLUMNW column{};
    column.mask = LVCF_TEXT | LVCF_WIDTH | LVCF_SUBITEM;
    column.pszText = const_cast<LPWSTR>(title);
    column.cx = width;
    column.iSubItem = index;
    ListView_InsertColumn(table, index, &column);
}

void setCell(HWND table, int row, int column, const std::wstring& value) {
    ListView_SetItemText(table, row, column, const_cast<LPWSTR>(value.c_str()));
}

HMENU makeMenu() {
    HMENU menu = CreateMenu();
    HMENU files = CreatePopupMenu();
    AppendMenuW(files, MF_STRING, NewInventory, L"New inventory...");
    AppendMenuW(files, MF_STRING, OpenInventory, L"Open inventory...");
    AppendMenuW(files, MF_STRING, ExportHtml, L"Export dashboard...");
    AppendMenuW(files, MF_STRING, BusinessName, L"Business identity...");
    AppendMenuW(files, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(files, MF_STRING, Exit, L"Exit");
    AppendMenuW(menu, MF_POPUP, reinterpret_cast<UINT_PTR>(files), L"File");

    HMENU products = CreatePopupMenu();
    AppendMenuW(products, MF_STRING, AddProduct, L"Add product...");
    AppendMenuW(products, MF_STRING, EditProduct, L"Edit selected product...");
    AppendMenuW(products, MF_STRING, SetQr, L"Set selected QR code...");
    AppendMenuW(menu, MF_POPUP, reinterpret_cast<UINT_PTR>(products), L"Products");

    HMENU stock = CreatePopupMenu();
    AppendMenuW(stock, MF_STRING, StockAction, L"Receive, remove, transfer, purchase or sale...");
    AppendMenuW(menu, MF_POPUP, reinterpret_cast<UINT_PTR>(stock), L"Stock");

    HMENU view = CreatePopupMenu();
    AppendMenuW(view, MF_STRING, ShowProducts, L"Inventory");
    AppendMenuW(view, MF_STRING, ShowActivity, L"Movement history");
    AppendMenuW(menu, MF_POPUP, reinterpret_cast<UINT_PTR>(view), L"View");
    return menu;
}

class App;

class Form {
public:
    enum class Kind { Product, Qr, Movement, Brand };
    Form(App& app, Kind kind, int productId) : app_(app), kind_(kind), productId_(productId) {}
    void run();

private:
    friend class App;
    static LRESULT CALLBACK procedure(HWND window, UINT message, WPARAM wParam, LPARAM lParam);
    void create();
    void layout();
    void submit();
    std::wstring field(int index) const { return textOf(fields_[index]); }
    void invalid(const wchar_t* message, HWND focus = nullptr) const;

    App& app_;
    Kind kind_;
    int productId_;
    HWND window_ = nullptr;
    HWND labels_[7]{};
    HWND fields_[7]{};
    HWND actionLabel_ = nullptr;
    HWND action_ = nullptr;
    HWND save_ = nullptr;
    HWND cancel_ = nullptr;
};

class App {
public:
    int run(const fs::path& initialFile);

private:
    friend class Form;
    static LRESULT CALLBACK procedure(HWND window, UINT message, WPARAM wParam, LPARAM lParam);
    LRESULT handle(UINT message, WPARAM wParam, LPARAM lParam);
    int scale(int value) const { return MulDiv(value, static_cast<int>(dpi_), 96); }
    void createControls();
    void layout();
    void paint();
    void recomputeSummary();
    void refresh();
    void refreshProducts();
    void refreshActivity();
    void refreshLocations();
    void switchView(bool activity);
    void command(int id);
    bool openFile(const fs::path& path, bool requireExisting = false);
    void pickFile(bool createNew);
    void exportHtml();
    bool saveDraft(Inventory& draft);
    bool saveBrand(const std::wstring& name);
    int resolveProduct(const std::wstring& code);
    void status(const std::wstring& message);
    int selectedProduct() const;

    Inventory inventory_;
    fs::path filename_;
    std::unique_ptr<InventoryFileLock> lock_;
    HWND window_ = nullptr;
    HWND search_ = nullptr;
    HWND products_ = nullptr;
    HWND activity_ = nullptr;
    HWND locations_ = nullptr;
    HWND status_ = nullptr;
    HWND open_ = nullptr;
    HWND brand_ = nullptr;
    HWND add_ = nullptr;
    HWND edit_ = nullptr;
    HWND stock_ = nullptr;
    HWND qr_ = nullptr;
    HWND export_ = nullptr;
    HWND clear_ = nullptr;
    HWND inventoryTab_ = nullptr;
    HWND activityTab_ = nullptr;
    HFONT font_ = nullptr;
    HFONT titleFont_ = nullptr;
    HFONT numberFont_ = nullptr;
    UINT dpi_ = 96;
    int activeProduct_ = 0;
    bool activityView_ = false;
    bool updating_ = false;
    std::wstring businessName_ = L"TowerFlow";
    std::int64_t unitCount_ = 0;
    int lowCount_ = 0;
    std::wstring inventoryValue_ = L"0.00";
    std::wstring note_ = L"Ready. Select a product or scan a code to get started.";
};

LRESULT CALLBACK App::procedure(HWND window, UINT message, WPARAM wParam, LPARAM lParam) {
    if (message == WM_NCCREATE) {
        const auto* created = reinterpret_cast<CREATESTRUCTW*>(lParam);
        auto* app = static_cast<App*>(created->lpCreateParams);
        SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(app));
        app->window_ = window;
    }
    auto* app = reinterpret_cast<App*>(GetWindowLongPtrW(window, GWLP_USERDATA));
    return app ? app->handle(message, wParam, lParam)
        : DefWindowProcW(window, message, wParam, lParam);
}

bool App::openFile(const fs::path& path, bool requireExisting) {
    std::error_code error;
    auto absolute = fs::absolute(path, error);
    if (error) {
        errorBox(window_, L"Cannot resolve that inventory path.");
        return false;
    }
    absolute = fs::weakly_canonical(absolute, error);
    if (error) {
        errorBox(window_, L"The inventory folder does not exist or cannot be opened.");
        return false;
    }
    if (lock_ && absolute == filename_) return true;
    auto proposedLock = std::make_unique<InventoryFileLock>(absolute);
    if (!proposedLock->acquired()) {
        errorBox(window_, L"Cannot lock this inventory. Check folder permissions and close other TowerFlow sessions.");
        return false;
    }
    const bool exists = fs::exists(absolute, error);
    if (error || (requireExisting && !exists)) {
        errorBox(window_, L"The selected inventory file does not exist.");
        return false;
    }
    Inventory proposed;
    if (exists && (!fs::is_regular_file(absolute, error) || error || !proposed.load(absolute))) {
        errorBox(window_, L"Cannot read the inventory file. The current inventory was not changed.");
        return false;
    }
    lock_ = std::move(proposedLock);
    filename_ = std::move(absolute);
    inventory_ = std::move(proposed);
    businessName_ = wide(loadBusinessName(filename_));
    recomputeSummary();
    activeProduct_ = 0;
    if (window_) {
        const auto title = businessName_ + L"  |  TowerFlow";
        SetWindowTextW(window_, title.c_str());
        SetWindowTextW(search_, L"");
        refresh();
        status(L"Opened " + filename_.wstring());
    }
    return true;
}

int App::run(const fs::path& initialFile) {
    if (!openFile(initialFile)) return 1;
    INITCOMMONCONTROLSEX common{ sizeof(common), ICC_LISTVIEW_CLASSES };
    InitCommonControlsEx(&common);
    WNDCLASSEXW mainClass{};
    mainClass.cbSize = sizeof(mainClass);
    mainClass.lpfnWndProc = &App::procedure;
    mainClass.hInstance = GetModuleHandleW(nullptr);
    mainClass.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    mainClass.hIcon = LoadIconW(nullptr, IDI_APPLICATION);
    mainClass.lpszClassName = L"TowerFlowDesktop";
    mainClass.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
    if (!RegisterClassExW(&mainClass)) return 1;
    WNDCLASSEXW formClass = mainClass;
    formClass.lpfnWndProc = &Form::procedure;
    formClass.lpszClassName = L"TowerFlowForm";
    if (!RegisterClassExW(&formClass)) return 1;

    const HMENU menu = makeMenu();
    const auto title = businessName_ + L"  |  TowerFlow";
    window_ = CreateWindowExW(0, mainClass.lpszClassName, title.c_str(),
        WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN, CW_USEDEFAULT, CW_USEDEFAULT,
        1240, 870, nullptr, menu, mainClass.hInstance, this);
    if (!window_) {
        DestroyMenu(menu);
        return 1;
    }
    ShowWindow(window_, SW_SHOW);
    UpdateWindow(window_);
    MSG message{};
    while (GetMessageW(&message, nullptr, 0, 0) > 0) {
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }
    return static_cast<int>(message.wParam);
}

void App::createControls() {
    dpi_ = GetDpiForWindow(window_);
    font_ = CreateFontW(-scale(14), 0, 0, 0, FW_NORMAL, 0, 0, 0,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");
    titleFont_ = CreateFontW(-scale(29), 0, 0, 0, FW_SEMIBOLD, 0, 0, 0,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");
    numberFont_ = CreateFontW(-scale(25), 0, 0, 0, FW_SEMIBOLD, 0, 0, 0,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY, DEFAULT_PITCH, L"Segoe UI");

    constexpr DWORD button = WS_TABSTOP | BS_OWNERDRAW;
    open_ = control(window_, L"BUTTON", L"Open inventory", button, OpenInventory);
    brand_ = control(window_, L"BUTTON", L"Business identity", button, BusinessName);
    add_ = control(window_, L"BUTTON", L"+ Add product", button, AddProduct);
    edit_ = control(window_, L"BUTTON", L"Edit product", button, EditProduct);
    stock_ = control(window_, L"BUTTON", L"Stock movement", button, StockAction);
    qr_ = control(window_, L"BUTTON", L"Set QR code", button, SetQr);
    export_ = control(window_, L"BUTTON", L"Export dashboard", button, ExportHtml);
    search_ = control(window_, L"EDIT", L"", WS_TABSTOP | ES_AUTOHSCROLL, SearchField, WS_EX_CLIENTEDGE);
    SendMessageW(search_, EM_LIMITTEXT, 1024, 0);
    clear_ = control(window_, L"BUTTON", L"Clear", button, ClearSearch);
    inventoryTab_ = control(window_, L"BUTTON", L"Inventory", button, ShowProducts);
    activityTab_ = control(window_, L"BUTTON", L"Movement history", button, ShowActivity);

    constexpr DWORD listStyle = WS_TABSTOP | LVS_REPORT | LVS_SINGLESEL | LVS_SHOWSELALWAYS;
    products_ = control(window_, WC_LISTVIEWW, L"", listStyle, ProductTable, WS_EX_CLIENTEDGE);
    activity_ = control(window_, WC_LISTVIEWW, L"", listStyle, ActivityTable, WS_EX_CLIENTEDGE);
    locations_ = control(window_, WC_LISTVIEWW, L"", listStyle, StockTable, WS_EX_CLIENTEDGE);
    status_ = control(window_, L"STATIC", note_.c_str(), SS_LEFTNOWORDWRAP, 0);
    HWND all[] = { open_, brand_, add_, edit_, stock_, qr_, export_, search_, clear_,
        inventoryTab_, activityTab_, products_, activity_, locations_, status_ };
    for (const auto child : all) setFont(child, font_);
    for (const auto table : { products_, activity_, locations_ }) {
        ListView_SetExtendedListViewStyle(table, LVS_EX_FULLROWSELECT | LVS_EX_DOUBLEBUFFER | LVS_EX_LABELTIP);
        ListView_SetBkColor(table, RGB(255, 255, 255));
        ListView_SetTextBkColor(table, RGB(255, 255, 255));
        ListView_SetTextColor(table, ink);
    }
    const wchar_t* productTitles[] = { L"ID", L"Product", L"Barcode", L"List price", L"Units", L"Low at", L"Status" };
    const int productWidths[] = { 65, 260, 170, 110, 90, 85, 110 };
    for (int i = 0; i < 7; ++i)
        addColumn(products_, i, productTitles[i], scale(productWidths[i]));
    const wchar_t* activityTitles[] = { L"Time (UTC)", L"Type", L"Product", L"Qty", L"From", L"To", L"Business", L"Unit price", L"Reference" };
    const int activityWidths[] = { 150, 95, 175, 65, 120, 120, 140, 105, 160 };
    for (int i = 0; i < 9; ++i)
        addColumn(activity_, i, activityTitles[i], scale(activityWidths[i]));
    addColumn(locations_, 0, L"Location", scale(250));
    addColumn(locations_, 1, L"Units", scale(95));
    ShowWindow(activity_, SW_HIDE);
    refresh();
    layout();
}

void App::layout() {
    if (!products_) return;
    RECT rect{};
    GetClientRect(window_, &rect);
    const int width = rect.right;
    const int height = rect.bottom;
    const int pad = scale(26);
    const int content = width - 2 * pad;
    MoveWindow(open_, width - pad - scale(150), scale(46), scale(150), scale(38), TRUE);
    MoveWindow(brand_, width - pad - scale(306), scale(46), scale(146), scale(38), TRUE);
    int x = pad;
    const struct { HWND window; int width; } buttons[] = {
        { add_, 148 }, { edit_, 132 }, { stock_, 164 }, { qr_, 130 }, { export_, 180 }
    };
    for (const auto& button : buttons) {
        MoveWindow(button.window, x, scale(268), scale(button.width), scale(40), TRUE);
        x += scale(button.width + 10);
    }
    MoveWindow(search_, pad + scale(112), scale(327), content - scale(112 + 82), scale(35), TRUE);
    MoveWindow(clear_, width - pad - scale(72), scale(327), scale(72), scale(35), TRUE);
    MoveWindow(inventoryTab_, pad, scale(378), scale(134), scale(38), TRUE);
    MoveWindow(activityTab_, pad + scale(146), scale(378), scale(184), scale(38), TRUE);
    const int listTop = scale(428);
    const int stockTop = height - scale(165);
    const int tableBottom = activityView_ ? height - scale(52) : stockTop - scale(16);
    MoveWindow(products_, pad, listTop, content,
        std::max(scale(120), tableBottom - listTop), TRUE);
    MoveWindow(activity_, pad, listTop, content,
        std::max(scale(120), height - scale(52) - listTop), TRUE);
    MoveWindow(locations_, pad, stockTop + scale(31), content,
        std::max(scale(55), height - scale(49) - stockTop - scale(31)), TRUE);
    MoveWindow(status_, pad, height - scale(33), content, scale(23), TRUE);
    InvalidateRect(window_, nullptr, FALSE);
}

void App::recomputeSummary() {
    unitCount_ = 0;
    lowCount_ = 0;
    for (const auto& product : inventory_.products()) {
        const auto total = product.totalStock();
        unitCount_ += total;
        if (total <= product.minimumStock) ++lowCount_;
    }
    inventoryValue_ = wide(inventoryListValue(inventory_));
}

void App::paint() {
    PAINTSTRUCT ps{};
    HDC dc = BeginPaint(window_, &ps);
    RECT client{};
    GetClientRect(window_, &client);
    HBRUSH backdrop = CreateSolidBrush(canvas);
    FillRect(dc, &client, backdrop);
    DeleteObject(backdrop);
    RECT banner{ 0, 0, client.right, scale(132) };
    HBRUSH bannerBrush = CreateSolidBrush(navy);
    FillRect(dc, &banner, bannerBrush);
    DeleteObject(bannerBrush);
    SetBkMode(dc, TRANSPARENT);

    HBRUSH emblem = CreateSolidBrush(accent);
    HPEN emblemLine = CreatePen(PS_SOLID, 1, accent);
    HGDIOBJ oldBrush = SelectObject(dc, emblem);
    HGDIOBJ oldPen = SelectObject(dc, emblemLine);
    RoundRect(dc, scale(26), scale(35), scale(72), scale(81), scale(12), scale(12));
    SelectObject(dc, oldBrush);
    SelectObject(dc, oldPen);
    DeleteObject(emblem);
    DeleteObject(emblemLine);
    SelectObject(dc, numberFont_);
    SetTextColor(dc, RGB(255, 255, 255));
    RECT monogram{ scale(28), scale(37), scale(70), scale(78) };
    DrawTextW(dc, L"TF", -1, &monogram, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    SelectObject(dc, font_);
    SetTextColor(dc, RGB(157, 200, 207));
    RECT eyebrow{ scale(89), scale(18), client.right - scale(344), scale(42) };
    DrawTextW(dc, L"TOWERFLOW  /  INVENTORY OPERATIONS", -1, &eyebrow,
        DT_SINGLELINE | DT_END_ELLIPSIS);
    SelectObject(dc, titleFont_);
    SetTextColor(dc, RGB(255, 255, 255));
    RECT title{ scale(89), scale(42), client.right - scale(346), scale(88) };
    DrawTextW(dc, businessName_.c_str(), -1, &title, DT_LEFT | DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS);
    SelectObject(dc, font_);
    SetTextColor(dc, RGB(174, 196, 206));
    RECT sub{ scale(28), scale(101), client.right - scale(28), scale(125) };
    const auto subtitle = L"DATA FILE   " + filename_.wstring();
    DrawTextW(dc, subtitle.c_str(), -1, &sub, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS);

    const int padding = scale(26);
    const int gap = scale(14);
    const int cardWidth = (client.right - 2 * padding - 3 * gap) / 4;
    const std::wstring values[] = {
        std::to_wstring(inventory_.products().size()),
        std::to_wstring(unitCount_),
        std::to_wstring(lowCount_),
        L"$" + inventoryValue_
    };
    const wchar_t* labels[] = { L"PRODUCTS", L"UNITS ON HAND", L"NEEDS ATTENTION", L"INVENTORY VALUE" };
    HBRUSH cardBrush = CreateSolidBrush(RGB(255, 255, 255));
    HPEN borderPen = CreatePen(PS_SOLID, 1, RGB(220, 229, 236));
    HGDIOBJ previousBrush = SelectObject(dc, cardBrush);
    HGDIOBJ previousPen = SelectObject(dc, borderPen);
    for (int i = 0; i < 4; ++i) {
        const int left = padding + i * (cardWidth + gap);
        RoundRect(dc, left, scale(150), left + cardWidth, scale(250), scale(12), scale(12));
        HBRUSH marker = CreateSolidBrush(i == 2 && lowCount_ ? warning : accent);
        RECT mark{ left + scale(16), scale(168), left + scale(20), scale(188) };
        FillRect(dc, &mark, marker);
        DeleteObject(marker);
        SetTextColor(dc, muted);
        SelectObject(dc, font_);
        RECT label{ left + scale(29), scale(167), left + cardWidth - scale(14), scale(190) };
        DrawTextW(dc, labels[i], -1, &label, DT_SINGLELINE | DT_END_ELLIPSIS);
        SetTextColor(dc, i == 2 && lowCount_ > 0 ? warning : ink);
        SelectObject(dc, numberFont_);
        RECT value{ left + scale(16), scale(205), left + cardWidth - scale(14), scale(238) };
        DrawTextW(dc, values[i].c_str(), -1, &value, DT_SINGLELINE | DT_END_ELLIPSIS);
    }
    SelectObject(dc, previousBrush);
    SelectObject(dc, previousPen);
    DeleteObject(cardBrush);
    DeleteObject(borderPen);
    SetTextColor(dc, muted);
    SelectObject(dc, font_);
    RECT searchLabel{ padding, scale(328), padding + scale(108), scale(361) };
    DrawTextW(dc, L"Search / scan", -1, &searchLabel, DT_SINGLELINE | DT_VCENTER);
    if (!activityView_) {
        std::wstring label = L"Stock by location";
        if (const auto* selected = inventory_.findProduct(activeProduct_))
            label += L"  ·  " + wide(selected->name) + L"  ·  " +
                std::to_wstring(selected->totalStock()) + L" units";
        RECT detail{ padding, client.bottom - scale(165), client.right - padding,
            client.bottom - scale(135) };
        SetTextColor(dc, ink);
        DrawTextW(dc, label.c_str(), -1, &detail, DT_SINGLELINE | DT_END_ELLIPSIS);
    }
    EndPaint(window_, &ps);
}

void App::status(const std::wstring& message) {
    note_ = message;
    if (status_) SetWindowTextW(status_, note_.c_str());
}

int App::selectedProduct() const {
    return inventory_.findProduct(activeProduct_) ? activeProduct_ : 0;
}

void App::refreshProducts() {
    updating_ = true;
    ListView_DeleteAllItems(products_);
    const auto query = utf8(textOf(search_));
    const auto matches = inventory_.search(query);
    int index = 0;
    for (const auto* product : matches) {
        const auto id = std::to_wstring(product->id);
        LVITEMW item{};
        item.mask = LVIF_TEXT | LVIF_PARAM;
        item.iItem = index;
        item.pszText = const_cast<LPWSTR>(id.c_str());
        item.lParam = product->id;
        const int row = ListView_InsertItem(products_, &item);
        setCell(products_, row, 1, wide(product->name));
        setCell(products_, row, 2, wide(product->barcode));
        setCell(products_, row, 3, L"$" + dollars(product->priceCents));
        setCell(products_, row, 4, std::to_wstring(product->totalStock()));
        setCell(products_, row, 5, std::to_wstring(product->minimumStock));
        setCell(products_, row, 6, product->totalStock() <= product->minimumStock ? L"LOW" : L"OK");
        if (activeProduct_ == product->id)
            ListView_SetItemState(products_, row, LVIS_SELECTED | LVIS_FOCUSED, LVIS_SELECTED | LVIS_FOCUSED);
        ++index;
    }
    if (activeProduct_ && ListView_GetNextItem(products_, -1, LVNI_SELECTED) < 0)
        activeProduct_ = 0;
    updating_ = false;
    refreshLocations();
    status(std::to_wstring(index) + L" products shown  ·  Inventory value $" + inventoryValue_);
}

void App::refreshActivity() {
    ListView_DeleteAllItems(activity_);
    const auto query = utf8(textOf(search_));
    std::unordered_set<int> matchingIds;
    if (!query.empty()) {
        for (const auto* product : inventory_.search(query)) matchingIds.insert(product->id);
    }
    int row = 0;
    for (auto movement = inventory_.movements().rbegin();
        movement != inventory_.movements().rend(); ++movement) {
        if (!query.empty() && !matchingIds.contains(movement->productId)) continue;
        const auto* product = inventory_.findProduct(movement->productId);
        auto time = timeUtc(movement->recordedAt);
        LVITEMW item{};
        item.mask = LVIF_TEXT;
        item.iItem = row;
        item.pszText = time.data();
        const int inserted = ListView_InsertItem(activity_, &item);
        setCell(activity_, inserted, 1, wide(movementName(movement->type)));
        setCell(activity_, inserted, 2, product ? wide(product->name) : std::to_wstring(movement->productId));
        setCell(activity_, inserted, 3, std::to_wstring(movement->quantity));
        setCell(activity_, inserted, 4, wide(movement->from));
        setCell(activity_, inserted, 5, wide(movement->to));
        setCell(activity_, inserted, 6, wide(movement->business));
        setCell(activity_, inserted, 7, movement->isTrade() ? L"$" + dollars(movement->unitPriceCents) : L"");
        setCell(activity_, inserted, 8, wide(movement->reference));
        ++row;
    }
    if (activityView_) status(std::to_wstring(row) + L" movements shown  ·  Newest first  ·  UTC");
}

void App::refreshLocations() {
    ListView_DeleteAllItems(locations_);
    const auto* selected = inventory_.findProduct(activeProduct_);
    if (selected) {
        int index = 0;
        for (const auto& [location, quantity] : selected->stock) {
            auto name = wide(location);
            LVITEMW item{};
            item.mask = LVIF_TEXT;
            item.iItem = index;
            item.pszText = name.data();
            const int row = ListView_InsertItem(locations_, &item);
            setCell(locations_, row, 1, std::to_wstring(quantity));
            ++index;
        }
    }
    InvalidateRect(window_, nullptr, FALSE);
}

void App::refresh() {
    if (!products_) return;
    refreshProducts();
    refreshActivity();
    InvalidateRect(window_, nullptr, FALSE);
}

void App::switchView(bool activity) {
    activityView_ = activity;
    ShowWindow(products_, activity ? SW_HIDE : SW_SHOW);
    ShowWindow(locations_, activity ? SW_HIDE : SW_SHOW);
    ShowWindow(activity_, activity ? SW_SHOW : SW_HIDE);
    EnableWindow(edit_, !activity);
    EnableWindow(qr_, !activity);
    InvalidateRect(inventoryTab_, nullptr, TRUE);
    InvalidateRect(activityTab_, nullptr, TRUE);
    refresh();
    layout();
}

bool App::saveDraft(Inventory& draft) {
    if (!draft.save(filename_)) {
        errorBox(window_, L"Could not save the inventory file. No changes were applied.");
        return false;
    }
    inventory_ = std::move(draft);
    recomputeSummary();
    refresh();
    status(L"Saved successfully  ·  " + filename_.wstring());
    return true;
}

bool App::saveBrand(const std::wstring& name) {
    if (!saveBusinessName(filename_, utf8(name))) {
        errorBox(window_, L"Could not save the business name. Check that the inventory folder is writable.");
        return false;
    }
    businessName_ = name;
    const auto title = businessName_ + L"  |  TowerFlow";
    SetWindowTextW(window_, title.c_str());
    InvalidateRect(window_, nullptr, FALSE);
    status(L"Business identity saved  ·  " + businessName_);
    return true;
}

int App::resolveProduct(const std::wstring& key) {
    const std::string code = utf8(key);
    const Product* byCode = inventory_.findCode(code);
    int number = 0;
    const Product* byId = wholeNumber(key, 1, number) ? inventory_.findProduct(number) : nullptr;
    if (byCode && byId && byCode->id != byId->id) {
        const auto question = L"This code matches two products.\n\nYes: product ID " +
            std::to_wstring(byId->id) + L" (" + wide(byId->name) + L")\nNo: barcode / QR (" +
            wide(byCode->name) + L")\nCancel: go back to the form.";
        const int choice = MessageBoxW(window_, question.c_str(), L"Choose a product",
            MB_YESNOCANCEL | MB_ICONQUESTION);
        if (choice == IDCANCEL) return -1;
        return choice == IDYES ? byId->id : byCode->id;
    }
    return byCode ? byCode->id : byId ? byId->id : 0;
}

void App::pickFile(bool createNew) {
    wchar_t name[32768]{};
    if (createNew) wcscpy_s(name, std::size(name), L"inventory.txt");
    OPENFILENAMEW dialog{};
    dialog.lStructSize = sizeof(dialog);
    dialog.hwndOwner = window_;
    dialog.lpstrFilter = L"TowerFlow inventory (*.txt)\0*.txt\0All files (*.*)\0*.*\0\0";
    dialog.lpstrFile = name;
    dialog.nMaxFile = std::size(name);
    dialog.lpstrDefExt = L"txt";
    dialog.Flags = OFN_EXPLORER | OFN_NOCHANGEDIR | OFN_PATHMUSTEXIST |
        (createNew ? 0 : OFN_FILEMUSTEXIST);
    if (createNew ? !GetSaveFileNameW(&dialog) : !GetOpenFileNameW(&dialog)) return;
    if (createNew) {
        std::error_code error;
        if (fs::exists(name, error) || error) {
            errorBox(window_, L"Choose a new filename to create an inventory. Existing files will not be overwritten.");
            return;
        }
    }
    openFile(name, !createNew);
}

void App::exportHtml() {
    wchar_t name[32768] = L"towerflow-dashboard.html";
    OPENFILENAMEW dialog{};
    dialog.lStructSize = sizeof(dialog);
    dialog.hwndOwner = window_;
    dialog.lpstrFilter = L"HTML dashboard (*.html)\0*.html\0All files (*.*)\0*.*\0\0";
    dialog.lpstrFile = name;
    dialog.nMaxFile = std::size(name);
    dialog.lpstrDefExt = L"html";
    dialog.Flags = OFN_EXPLORER | OFN_NOCHANGEDIR | OFN_PATHMUSTEXIST;
    if (!GetSaveFileNameW(&dialog)) return;
    fs::path destination(name);
    std::error_code error;
    const auto absolute = fs::absolute(destination, error);
    if (error) {
        errorBox(window_, L"Cannot resolve the dashboard output path.");
        return;
    }
    const auto target = fs::weakly_canonical(absolute, error);
    if (error || target == filename_ || fs::exists(destination, error) || error) {
        errorBox(window_, L"Choose a new HTML filename, different from the inventory file. Existing files are not overwritten.");
        return;
    }
    if (!exportDashboard(inventory_, destination, utf8(businessName_))) {
        errorBox(window_, L"Could not export the dashboard. Choose a new name in a writable folder.");
        return;
    }
    status(L"Dashboard exported to " + destination.wstring());
    if (MessageBoxW(window_, L"Dashboard exported. Open it in your browser?",
        L"TowerFlow", MB_YESNO | MB_ICONINFORMATION) == IDYES)
        ShellExecuteW(window_, L"open", destination.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
}

void App::command(int id) {
    switch (id) {
    case NewInventory: pickFile(true); break;
    case OpenInventory: pickFile(false); break;
    case ExportHtml: exportHtml(); break;
    case BusinessName: Form(*this, Form::Kind::Brand, 0).run(); break;
    case Exit: DestroyWindow(window_); break;
    case AddProduct: Form(*this, Form::Kind::Product, 0).run(); break;
    case EditProduct:
    case SetQr:
        if (!selectedProduct()) {
            MessageBoxW(window_, L"Select a product in the inventory table first.",
                L"TowerFlow", MB_OK | MB_ICONINFORMATION);
        }
        else Form(*this, id == SetQr ? Form::Kind::Qr : Form::Kind::Product, selectedProduct()).run();
        break;
    case StockAction: Form(*this, Form::Kind::Movement, selectedProduct()).run(); break;
    case ShowProducts: switchView(false); break;
    case ShowActivity: switchView(true); break;
    case ClearSearch: SetWindowTextW(search_, L""); SetFocus(search_); break;
    }
}

LRESULT App::handle(UINT message, WPARAM wParam, LPARAM lParam) {
    switch (message) {
    case WM_CREATE: createControls(); return 0;
    case WM_SIZE: layout(); return 0;
    case WM_GETMINMAXINFO: {
        auto* info = reinterpret_cast<MINMAXINFO*>(lParam);
        info->ptMinTrackSize = { scale(1060), scale(820) };
        return 0;
    }
    case WM_ERASEBKGND: return 1;
    case WM_PAINT: paint(); return 0;
    case WM_DRAWITEM: {
        const auto* item = reinterpret_cast<DRAWITEMSTRUCT*>(lParam);
        if (item->CtlType == ODT_BUTTON) {
            const bool tab = item->CtlID == ShowProducts || item->CtlID == ShowActivity;
            const bool active = item->CtlID == ShowActivity ? activityView_ : !activityView_;
            drawButton(*item, item->CtlID == AddProduct || item->CtlID == StockAction,
                tab, active);
            return TRUE;
        }
        break;
    }
    case WM_CTLCOLORSTATIC: {
        auto dc = reinterpret_cast<HDC>(wParam);
        SetBkColor(dc, canvas);
        SetDCBrushColor(dc, canvas);
        SetTextColor(dc, muted);
        return reinterpret_cast<LRESULT>(GetStockObject(DC_BRUSH));
    }
    case WM_NOTIFY: {
        const auto* notify = reinterpret_cast<NMHDR*>(lParam);
        if (notify->code == NM_CUSTOMDRAW && (notify->idFrom == ProductTable ||
            notify->idFrom == ActivityTable || notify->idFrom == StockTable)) {
            auto* draw = reinterpret_cast<NMLVCUSTOMDRAW*>(lParam);
            if (draw->nmcd.dwDrawStage == CDDS_PREPAINT) return CDRF_NOTIFYITEMDRAW;
            if (draw->nmcd.dwDrawStage == CDDS_ITEMPREPAINT)
                draw->clrTextBk = draw->nmcd.dwItemSpec % 2
                    ? RGB(248, 251, 253) : RGB(255, 255, 255);
            return CDRF_DODEFAULT;
        }
        if (!updating_ && notify->idFrom == ProductTable) {
            if (notify->code == LVN_ITEMCHANGED) {
                const int row = ListView_GetNextItem(products_, -1, LVNI_SELECTED);
                if (row >= 0) {
                    LVITEMW item{};
                    item.mask = LVIF_PARAM;
                    item.iItem = row;
                    if (ListView_GetItem(products_, &item)) activeProduct_ = static_cast<int>(item.lParam);
                }
                else activeProduct_ = 0;
                refreshLocations();
            }
            else if (notify->code == NM_DBLCLK && selectedProduct()) command(EditProduct);
        }
        return 0;
    }
    case WM_COMMAND:
        if (LOWORD(wParam) == SearchField && HIWORD(wParam) == EN_CHANGE) {
            refresh();
        }
        else if (HIWORD(wParam) == BN_CLICKED || lParam == 0) {
            command(LOWORD(wParam));
        }
        return 0;
    case WM_CLOSE: DestroyWindow(window_); return 0;
    case WM_DESTROY:
        DeleteObject(font_);
        DeleteObject(titleFont_);
        DeleteObject(numberFont_);
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(window_, message, wParam, lParam);
}

LRESULT CALLBACK Form::procedure(HWND window, UINT message, WPARAM wParam, LPARAM lParam) {
    if (message == WM_NCCREATE) {
        auto* form = static_cast<Form*>(reinterpret_cast<CREATESTRUCTW*>(lParam)->lpCreateParams);
        SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(form));
        form->window_ = window;
    }
    auto* form = reinterpret_cast<Form*>(GetWindowLongPtrW(window, GWLP_USERDATA));
    if (!form) return DefWindowProcW(window, message, wParam, lParam);
    switch (message) {
    case WM_CREATE: form->create(); return 0;
    case WM_DRAWITEM: {
        const auto* item = reinterpret_cast<DRAWITEMSTRUCT*>(lParam);
        if (item->CtlType == ODT_BUTTON) {
            drawButton(*item, item->CtlID == IDOK);
            return TRUE;
        }
        break;
    }
    case WM_COMMAND:
        if (LOWORD(wParam) == IDOK && HIWORD(wParam) == BN_CLICKED) form->submit();
        else if (LOWORD(wParam) == IDCANCEL && HIWORD(wParam) == BN_CLICKED) DestroyWindow(window);
        else if (LOWORD(wParam) == ActionField && HIWORD(wParam) == CBN_SELCHANGE) form->layout();
        return 0;
    case WM_CLOSE: DestroyWindow(window); return 0;
    case WM_DESTROY: form->window_ = nullptr; return 0;
    }
    return DefWindowProcW(window, message, wParam, lParam);
}

void Form::run() {
    const wchar_t* title = kind_ == Kind::Movement ? L"Record stock movement"
        : kind_ == Kind::Qr ? L"Set QR code" : kind_ == Kind::Brand ? L"Business identity"
        : productId_ ? L"Edit product" : L"Add product";
    RECT owner{};
    GetWindowRect(app_.window_, &owner);
    const int width = app_.scale(580);
    const int height = app_.scale(kind_ == Kind::Movement ? 600
        : kind_ == Kind::Qr || kind_ == Kind::Brand ? 235 : 470);
    const int left = owner.left + std::max(0L, ((owner.right - owner.left) - width) / 2);
    const int top = owner.top + std::max(0L, ((owner.bottom - owner.top) - height) / 2);
    window_ = CreateWindowExW(WS_EX_DLGMODALFRAME, L"TowerFlowForm", title,
        WS_POPUP | WS_CAPTION | WS_SYSMENU, left, top, width, height,
        app_.window_, nullptr, GetModuleHandleW(nullptr), this);
    if (!window_) {
        errorBox(app_.window_, L"Could not open the form.");
        return;
    }
    EnableWindow(app_.window_, FALSE);
    ShowWindow(window_, SW_SHOW);
    SetForegroundWindow(window_);
    SetFocus(fields_[0]);
    MSG message{};
    while (IsWindow(window_)) {
        const int result = GetMessageW(&message, nullptr, 0, 0);
        if (result <= 0) {
            if (IsWindow(window_)) DestroyWindow(window_);
            if (result == 0) PostQuitMessage(static_cast<int>(message.wParam));
            break;
        }
        if (message.message == WM_KEYDOWN &&
            GetAncestor(message.hwnd, GA_ROOT) == window_) {
            if (message.wParam == VK_ESCAPE) {
                DestroyWindow(window_);
                continue;
            }
            if (message.wParam == VK_RETURN && GetFocus() != action_) {
                if (GetFocus() == cancel_) DestroyWindow(window_);
                else submit();
                continue;
            }
        }
        if (!IsDialogMessageW(window_, &message)) {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }
    EnableWindow(app_.window_, TRUE);
    SetActiveWindow(app_.window_);
}

void Form::create() {
    const bool movement = kind_ == Kind::Movement;
    const int count = movement ? 7 : kind_ == Kind::Qr || kind_ == Kind::Brand ? 1 : 5;
    const wchar_t* productLabels[] = {
        L"Product name", L"Barcode", L"List price ($)", L"Low stock threshold", L"QR payload (optional)"
    };
    const wchar_t* movementLabels[] = {
        L"Product ID / barcode / QR", L"From location", L"To location", L"Quantity",
        L"Unit price ($)", L"Supplier / customer", L"Invoice / order reference (optional)"
    };
    if (movement) {
        actionLabel_ = control(window_, L"STATIC", L"Action", SS_LEFT, 0);
        action_ = control(window_, L"COMBOBOX", L"", WS_TABSTOP | CBS_DROPDOWNLIST | WS_VSCROLL,
            ActionField);
        setFont(actionLabel_, app_.font_);
        setFont(action_, app_.font_);
        for (const wchar_t* title : { L"Receive", L"Remove", L"Transfer", L"Purchase", L"Sale" })
            SendMessageW(action_, CB_ADDSTRING, 0, reinterpret_cast<LPARAM>(title));
        SendMessageW(action_, CB_SETCURSEL, 0, 0);
    }
    for (int i = 0; i < count; ++i) {
        const wchar_t* title = kind_ == Kind::Brand ? L"Business name displayed in the header"
            : kind_ == Kind::Qr ? L"QR payload (blank clears it)"
            : movement ? movementLabels[i] : productLabels[i];
        labels_[i] = control(window_, L"STATIC", title, SS_LEFT, 0);
        fields_[i] = control(window_, L"EDIT", L"", WS_TABSTOP | ES_AUTOHSCROLL,
            FirstField + i, WS_EX_CLIENTEDGE);
        SendMessageW(fields_[i], EM_LIMITTEXT, kind_ == Kind::Brand ? 70 : 1024, 0);
        setFont(labels_[i], app_.font_);
        setFont(fields_[i], app_.font_);
    }
    if (kind_ == Kind::Product && productId_) {
        if (const auto* product = app_.inventory_.findProduct(productId_)) {
            SetWindowTextW(fields_[0], wide(product->name).c_str());
            SetWindowTextW(fields_[1], wide(product->barcode).c_str());
            SetWindowTextW(fields_[2], dollars(product->priceCents).c_str());
            SetWindowTextW(fields_[3], std::to_wstring(product->minimumStock).c_str());
            SetWindowTextW(fields_[4], wide(product->qrPayload).c_str());
        }
    }
    if (kind_ == Kind::Qr) {
        if (const auto* product = app_.inventory_.findProduct(productId_))
            SetWindowTextW(fields_[0], wide(product->qrPayload).c_str());
    }
    if (kind_ == Kind::Brand) SetWindowTextW(fields_[0], app_.businessName_.c_str());
    if (movement && productId_) SetWindowTextW(fields_[0], std::to_wstring(productId_).c_str());
    save_ = control(window_, L"BUTTON", L"Save", WS_TABSTOP | BS_OWNERDRAW, IDOK);
    cancel_ = control(window_, L"BUTTON", L"Cancel", WS_TABSTOP | BS_OWNERDRAW, IDCANCEL);
    setFont(save_, app_.font_);
    setFont(cancel_, app_.font_);
    layout();
}

void Form::layout() {
    RECT area{};
    GetClientRect(window_, &area);
    const int left = app_.scale(24);
    const int width = area.right - left * 2;
    int y = app_.scale(20);
    if (kind_ == Kind::Movement) {
        MoveWindow(actionLabel_, left, y, width, app_.scale(21), TRUE);
        y += app_.scale(23);
        MoveWindow(action_, left, y, width, app_.scale(180), TRUE);
        y += app_.scale(39);
    }
    const int selection = kind_ == Kind::Movement ? static_cast<int>(SendMessageW(action_, CB_GETCURSEL, 0, 0)) : 0;
    const int count = kind_ == Kind::Movement ? 7
        : kind_ == Kind::Qr || kind_ == Kind::Brand ? 1 : 5;
    for (int i = 0; i < count; ++i) {
        bool visible = true;
        if (kind_ == Kind::Movement) {
            if (i == 1) visible = selection == 1 || selection == 2 || selection == 4;
            if (i == 2) visible = selection == 0 || selection == 2 || selection == 3;
            if (i >= 4) visible = selection == 3 || selection == 4;
        }
        ShowWindow(labels_[i], visible ? SW_SHOW : SW_HIDE);
        ShowWindow(fields_[i], visible ? SW_SHOW : SW_HIDE);
        if (!visible) continue;
        MoveWindow(labels_[i], left, y, width, app_.scale(21), TRUE);
        y += app_.scale(23);
        MoveWindow(fields_[i], left, y, width, app_.scale(29), TRUE);
        y += app_.scale(42);
    }
    MoveWindow(save_, area.right - left - app_.scale(215), area.bottom - app_.scale(56),
        app_.scale(100), app_.scale(33), TRUE);
    MoveWindow(cancel_, area.right - left - app_.scale(105), area.bottom - app_.scale(56),
        app_.scale(105), app_.scale(33), TRUE);
}

void Form::invalid(const wchar_t* message, HWND focus) const {
    MessageBoxW(window_, message, L"Check these details", MB_OK | MB_ICONWARNING);
    if (focus) SetFocus(focus);
}

void Form::submit() {
    if (kind_ == Kind::Brand) {
        const auto name = trimmed(field(0));
        if (!validBusinessName(utf8(name))) {
            invalid(L"Enter a short business name using up to 70 characters.", fields_[0]);
            return;
        }
        if (app_.saveBrand(name)) DestroyWindow(window_);
        return;
    }
    std::optional<Inventory> draft;
    int resultId = productId_;
    if (kind_ == Kind::Qr) {
        draft.emplace(app_.inventory_);
        if (!draft->setQrPayload(productId_, utf8(field(0)))) {
            invalid(L"Enter a unique QR payload or leave it blank to clear it.", fields_[0]);
            return;
        }
    }
    else if (kind_ == Kind::Product) {
        int minimum = 0;
        std::int64_t price = 0;
        if (!priceInCents(field(2), price)) {
            invalid(L"Enter a valid list price, such as 12.50.", fields_[2]);
            return;
        }
        if (!wholeNumber(field(3), 0, minimum)) {
            invalid(L"The low stock threshold must be a whole number of zero or more.", fields_[3]);
            return;
        }
        const auto name = utf8(field(0));
        const auto barcode = utf8(field(1));
        draft.emplace(app_.inventory_);
        const bool valid = productId_ ? draft->editProduct(productId_, name, barcode, price, minimum)
            : draft->addProduct(name, barcode, price, minimum);
        if (!valid) {
            invalid(L"Enter a name and unique barcode. A barcode cannot duplicate a QR code.", fields_[1]);
            return;
        }
        resultId = productId_ ? productId_ : draft->products().back().id;
        if (!draft->setQrPayload(resultId, utf8(field(4)))) {
            invalid(L"The QR payload must be unique across all barcodes and QR codes.", fields_[4]);
            return;
        }
    }
    else {
        const int id = app_.resolveProduct(field(0));
        if (id == -1) return;
        if (!id) {
            invalid(L"Choose an existing product ID, barcode, or QR payload.", fields_[0]);
            return;
        }
        int quantity = 0;
        if (!wholeNumber(field(3), 1, quantity)) {
            invalid(L"Quantity must be a whole number greater than zero.", fields_[3]);
            return;
        }
        const int action = static_cast<int>(SendMessageW(action_, CB_GETCURSEL, 0, 0));
        std::int64_t price = 0;
        if ((action == 3 || action == 4) && !priceInCents(field(4), price)) {
            invalid(L"Enter a valid unit price, such as 12.50.", fields_[4]);
            return;
        }
        const std::string from = utf8(field(1)), to = utf8(field(2));
        const std::string business = utf8(field(5)), reference = utf8(field(6));
        draft.emplace(app_.inventory_);
        bool valid = false;
        switch (action) {
        case 0: valid = draft->receive(id, to, quantity); break;
        case 1: valid = draft->remove(id, from, quantity); break;
        case 2: valid = draft->transfer(id, from, to, quantity); break;
        case 3: valid = draft->purchase(id, to, quantity, price, business, reference); break;
        case 4: valid = draft->sell(id, from, quantity, price, business, reference); break;
        }
        if (!valid) {
            invalid(L"Check locations and available stock. Sales and purchases require a supplier or customer. Transfers need different locations.");
            return;
        }
        resultId = id;
    }
    const int previousSelection = app_.activeProduct_;
    if (resultId) app_.activeProduct_ = resultId;
    if (app_.saveDraft(*draft)) {
        DestroyWindow(window_);
    }
    else app_.activeProduct_ = previousSelection;
}
} 

int runWindowsGui(const std::filesystem::path& inventoryFile) {
    App app;
    return app.run(inventoryFile);
}

#endif
