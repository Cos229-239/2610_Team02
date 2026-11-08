#include "../OperationsConsole.h"
#include <iostream>
#include <sstream>
#include <stdexcept>

int checks = 0;
void check(bool condition, const char* message) {
    ++checks;
    if (!condition) throw std::runtime_error(message);
}

int main() {
    using namespace towerflow;
    std::vector<Part> parts{{"Network cable", "A42","900", 12}, {"Switch", "B77","901", 3}};
    OperationsInventory store(parts);
    check(store.createWorkOrder("Install network","A42",4)==OperationResult::success,"create work order");
    check(parts[0].Quantity==12,"work order does not consume stock");
    check(store.workOrders()[0].id==1 && store.workOrders()[0].line.partId=="A42","work ID and part ID");
    check(store.createWorkOrder(" ","A42",4)==OperationResult::invalidData,"blank description");
    check(store.createWorkOrder("Test","A42",0)==OperationResult::invalidData,"zero planned units");
    check(store.createWorkOrder("Test","X999",1)==OperationResult::notFound,"unknown planned part");
    check(store.editWorkOrder(1,"Updated job","B77",2)==OperationResult::success,"edit work order");
    check(store.workOrders()[0].line.partName=="Switch","updated part snapshot");
    check(store.editWorkOrder(1,"Bad","A42",-1)==OperationResult::invalidData,"bad edit");
    check(store.workOrders()[0].description=="Updated job","bad edit unchanged");
    check(store.editWorkOrder(999,"Job","A42",1)==OperationResult::notFound,"missing order edit");
    check(store.deleteWorkOrder(999)==OperationResult::notFound,"missing order delete");
    check(store.deleteWorkOrder(1)==OperationResult::success,"delete order");
    check(store.workOrders().empty() && parts[0].Quantity==12,"delete no stock mutation");
    store.createWorkOrder("New job","A42",1);
    check(store.workOrders()[0].id==2,"deleted ID not reused");

    check(store.purchasePart("Supplier","A42",8,1250)==OperationResult::success,"receive purchase");
    check(parts[0].Quantity==20 && parts[1].Quantity==3,"purchase correct stock");
    check(store.receipts()[0].totalCents()==10000,"receipt money calculation");
    check(store.purchasePart("Supplier","A42",-1,100)==OperationResult::invalidData,"negative receipt quantity");
    check(store.purchasePart("Supplier","A42",1,-1)==OperationResult::invalidData,"negative cost");
    check(store.purchasePart("","A42",1,100)==OperationResult::invalidData,"blank supplier");
    check(store.purchasePart("Supplier","X999",1,100)==OperationResult::notFound,"receipt unknown part");
    check(store.receipts().size()==1 && parts[0].Quantity==20,"failed receipts atomic");

    check(store.createPurchaseOrder("Supplier","A42",100,500)==OperationResult::success,"create purchase order");
    check(parts[0].Quantity==20,"pending order adds no stock");
    check(store.purchaseOrders()[0].totalCents()==50000,"purchase order total");
    check(store.createPurchaseOrder("Supplier","A42",0,500)==OperationResult::invalidData,"zero order quantity");
    check(store.createPurchaseOrder("Supplier","X999",1,0)==OperationResult::notFound,"unknown ordered part");
    check(store.purchaseOrders().size()==1,"invalid purchase orders not appended");

    check(store.createSale("Customer","A42",6,2500)==OperationResult::success,"sale");
    check(parts[0].Quantity==14 && store.sales()[0].totalCents()==15000,"sale quantity and price");
    check(store.createSale("Customer","A42",15,100)==OperationResult::insufficientStock,"oversale refused");
    check(store.createSale("Customer","A42",0,100)==OperationResult::invalidData,"zero sale");
    check(store.createSale("Customer","A42",1,-1)==OperationResult::invalidData,"negative sale price");
    check(store.createSale("  ","A42",1,100)==OperationResult::invalidData,"blank customer");
    check(store.sales().size()==1 && parts[0].Quantity==14,"failed sales atomic");
    parts.push_back({"Duplicate","A42","999",1});
    check(store.createSale("Customer","A42",1,100)==OperationResult::duplicatePartId,"duplicate sale part");
    check(store.purchasePart("Supplier","A42",1,100)==OperationResult::duplicatePartId,"duplicate receipt part");
    parts.pop_back();
    parts[0].Quantity=std::numeric_limits<int>::max();
    check(store.purchasePart("Supplier","A42",1,100)==OperationResult::overflow,"stock overflow");
    parts[0].Quantity=14;
    check(store.createSale("Customer","A42",14,0)==OperationResult::success,"sell exact stock at zero price");
    check(parts[0].Quantity==0,"stock reaches zero");
    parts[0].Name="Renamed";
    parts.erase(parts.begin());
    check(store.sales()[0].line.partName=="Network cable","sale snapshot survives rename/delete");
    check(store.editWorkOrder(2,"Replan","A42",1)==OperationResult::notFound,"replan deleted part refused");
    check(store.deleteWorkOrder(2)==OperationResult::success,"order can be deleted after part removed");

    parts={{"Cable","A42","900",12}};
    OperationsInventory consoleStore(parts);
    std::ostringstream output;
    std::istringstream create("\nInstall network\n42-abc\nA42\n2\n");
    OperationsConsole(consoleStore,create,output).createWorkOrder();
    check(consoleStore.workOrders().size()==1,"console blank/invalid input retries");
    std::istringstream incomplete("1\nReplacement\nA42\n");
    OperationsConsole(consoleStore,incomplete,output).editWorkOrder();
    check(consoleStore.workOrders()[0].description=="Install network","EOF edit unchanged");
    std::istringstream cancelDelete("1\nno\n");
    OperationsConsole(consoleStore,cancelDelete,output).deleteWorkOrder();
    check(consoleStore.workOrders().size()==1,"delete cancellation");
    std::istringstream deleteInput("1\nDELETE\n");
    OperationsConsole(consoleStore,deleteInput,output).deleteWorkOrder();
    check(consoleStore.workOrders().empty(),"delete confirmation");
    std::istringstream cancelledSale("Customer\nA42\n3\n100\nno\n");
    OperationsConsole(consoleStore,cancelledSale,output).createSale();
    check(consoleStore.sales().empty() && parts[0].Quantity==12,"sale cancellation");
    std::istringstream sale("Customer\nA42\n3\n100\nSELL\n");
    OperationsConsole(consoleStore,sale,output).createSale();
    check(consoleStore.sales().size()==1 && parts[0].Quantity==9,"console sale");
    std::istringstream purchase("Supplier\nA42\n2\n50\nRECEIVE\n");
    OperationsConsole(consoleStore,purchase,output).purchasePart();
    check(parts[0].Quantity==11 && consoleStore.receipts().size()==1,"console receipt");
    std::istringstream po("Supplier\nA42\n2\n50\n");
    OperationsConsole(consoleStore,po,output).purchaseOrder();
    check(parts[0].Quantity==11 && consoleStore.purchaseOrders().size()==1,"console pending order");
    std::istringstream eof("");
    OperationsConsole(consoleStore,eof,output).createSale();
    check(parts[0].Quantity==11,"EOF sale unchanged");
    check(output.str().find("Total cents: 300")!=std::string::npos,"visible receipt total");
    std::cout << checks << " operation checks passed.\n";
}
