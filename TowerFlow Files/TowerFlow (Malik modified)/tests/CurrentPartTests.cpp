#include "../Menu (Malik version).cpp"
#include "../PartActions (Malik version).cpp"
#include <sstream>
#include <functional>

std::string run(const std::string& input, const std::function<void()>& action) {
    std::istringstream keyboard(input);
    std::ostringstream screen;
    auto* oldIn = std::cin.rdbuf(keyboard.rdbuf());
    auto* oldOut = std::cout.rdbuf(screen.rdbuf());
    std::cin.clear();
    action();
    std::cin.rdbuf(oldIn);
    std::cout.rdbuf(oldOut);
    std::cin.clear();
    return screen.str();
}
int main() {
    int failures = 0;
    auto check = [&](bool value, const char* name) {
        std::cout << (value ? "PASS: " : "FAIL: ") << name << '\n';
        if (!value) ++failures;
    };
    Parts.clear();
    check(run("", []{TotalStockCount();}).find("Total Stock: 0") != std::string::npos,
          "Empty inventory total is zero");
    run("Cable\nA42\n900\n12\n\n", []{CreatePart();});
    check(Parts.size()==1 && Parts[0].PartId=="A42" && Parts[0].Quantity==12,
          "Create part stores provided values");
    check(run("", []{ListParts();}).find("Cable")!=std::string::npos,
          "List displays created part");
    run("A42\nUpdated\nA42\n900\n20\n", []{EditPart();});
    check(Parts.size()==1 && Parts[0].Quantity==20,
          "Edit finds actual Part ID A42 (not vector position)");
    run("A42\nDELETE\n", []{DeletePart();});
    check(Parts.empty(), "Delete finds actual Part ID A42");
    Parts.clear();
    run("Cable\nA42\n900\n-3\n\n", []{CreatePart();});
    check(Parts.empty(), "Create rejects negative quantity");
    Parts.clear();
    run("Cable\nA42\n900\n12\n\n", []{CreatePart();});
    run("Other\nA42\n901\n4\n\n", []{CreatePart();});
    check(Parts.size()==1, "Create rejects duplicate Part ID");
    int value=0;
    run("3abc\n4\n", [&]{GetValidatedInt(value);});
    check(value==4, "Integer validation rejects trailing text and retries");
    Parts = {{"First","A42","900",12},{"Second","B77","901",3}};
    run("A42\nChanged\nB77\n999\n99\n", []{EditPart();});
    check(Parts[0].Name=="First" && Parts[0].Quantity==12,
          "Duplicate ID edit leaves all original fields unchanged");
    run("A42\nChanged\nA42\n999\n-1\n", []{EditPart();});
    check(Parts[0].Name=="First" && Parts[0].SerialNumber=="900",
          "Invalid quantity edit is atomic");
    run("A42\nChanged\n", []{EditPart();});
    check(Parts[0].Name=="First", "Closed input does not partially edit a part");
    run("1\n", []{DeletePart();});
    check(Parts.size()==2, "Vector position 1 cannot delete Part ID A42");
    run("A42\nDELETE\n", []{DeletePart();});
    check(Parts.size()==1 && Parts[0].PartId=="B77", "Delete preserves unrelated parts");
    Parts.clear();
    run("  Network Cable  \nA42\n900\n12\n", []{CreatePart();});
    check(Parts.size()==1 && Parts[0].Name=="Network Cable", "Names support spaces and trim edges");
    run("\n\t\nNew part\nB77\n901\n0\n", []{CreatePart();});
    check(Parts.size()==2 && Parts[1].Name=="New part" && Parts[1].Quantity==0,
          "Blank names retry and zero stock is accepted");
    const auto oldSize=Parts.size();
    run("Incomplete\n", []{CreatePart();});
    check(Parts.size()==oldSize, "Closed input does not create incomplete parts");
    Parts = {{"First","A42","900",2147483647},{"Second","B77","901",2147483647}};
    check(run("", []{TotalStockCount();}).find("4294967294")!=std::string::npos,
          "Combined stock uses a wider total");
    Parts.clear();
    auto inputCheck = run("Widget\nB-42\n B42 \n123456789012345678901\n00123456789012345678\n2\n", []{CreatePart();});
    check(Parts.size()==1 && Parts[0].PartId=="B42" && Parts[0].SerialNumber=="00123456789012345678",
          "Alphanumeric ID and 20-digit serial are stored exactly");
    check(inputCheck.find("Use letters and digits only")!=std::string::npos &&
          inputCheck.find("1 to 20 digits")!=std::string::npos,
          "Bad ID and overlong serial are rejected and re-prompted");
    run("B42\nWidget\n007\n/back\n", []{EditPart();});
    check(Parts.size()==1 && Parts[0].PartId=="B42", "Cancelling at serial leaves Part ID unchanged");
    towerflow::TakeOptionCancellation();
    std::cout << failures << " checks failed.\n";
    return failures ? 1 : 0;
}


