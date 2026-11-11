#include "PartData.h"
#include <iostream>
#include <string>
#include <vector>
using namespace std; //shortcut and cleaner reading

void AddPart(const string& name, int revision, int partNumber, int serialNumber, int quantity){// pulling the same function from CreatePart but no cin or cout for GUI
    Part NewPart;
    NewPart.Name = name;
    NewPart.Revision = revision;
    NewPart.PartNumber = partNumber;
    NewPart.SerialNumber = serialNumber;
    NewPart.Quantity = quantity;
    Parts.push_back(NewPart);
    SaveParts();
}

bool UpdatePart(const string& name, int revision, int partNumber, int serialNumber, int quantity){
    int index = FindPartIndex(partNumber);
    if (index != -1) {
        Parts[index].Name = name;
        Parts[index].Revision = revision;
        Parts[index].SerialNumber = serialNumber;
        Parts[index].Quantity = quantity;
        Parts[index].PartNumber = partNumber;
        SaveParts();
        return true;
    }
    return false;
}

bool RemovePart(int partNumber){
    int index = FindPartIndex(partNumber);
    if (index != -1) {
        Parts.erase(Parts.begin() + index);
        SaveParts();
        return true;
    }
    return false;
}

vector<Part> ListAllParts(const string& filter){
    vector<Part> filteredParts;
    for (const auto& part : Parts) {
        if (filter.empty() || part.Name.find(filter) != string::npos) {
            filteredParts.push_back(part);
        }
    }
    return filteredParts;
}

int TotalStock(const string& filter){
    int total = 0;
    for (const auto& part : Parts) {
        if (filter.empty() || part.Name.find(filter) != string::npos) {
            total += part.Quantity;
        }
    }
    return total;
}