using System;
using System.Collections.Generic;
using System.Text;

namespace TowerFlowWinForm
{
    public class Part
    {
        public string Name = string.Empty; //make sure to avoid null reference exceptions by using an empty string.
        public int Revision { get; set; }
        public int PartNumber { get; set; }
        public int SerialNumber { get; set; }
        public int Quantity { get; set; }  

    }

    public static class PartData
    {
        private static List<Part> parts = new List<Part>();
        private const string PartsFile = "parts.txt";

        public static bool SaveParts()
        {
            var lines = parts.Select(p => $"{p.Name},{p.Revision},{p.PartNumber},{p.SerialNumber},{p.Quantity}");
            System.IO.File.WriteAllLines(PartsFile, lines);
            return true;
        }

        public static bool LoadParts()
        {
            if (System.IO.File.Exists(PartsFile))
            {
                var lines = System.IO.File.ReadAllLines(PartsFile);
                parts = lines.Select(line =>
                {
                    var fields = line.Split(',');
                    return new Part
                    {
                        Name = fields[0],
                        Revision = int.Parse(fields[1]),
                        PartNumber = int.Parse(fields[2]),
                        SerialNumber = int.Parse(fields[3]),
                        Quantity = int.Parse(fields[4])
                    };
                }).ToList();
                return true;
            }
            return false;
        }

        private static int FindPartIndex(int partNumber, int serialNumber)
        {
            return parts.FindIndex(p => p.PartNumber == partNumber && p.SerialNumber == serialNumber);
        }

        public static bool AddPart(Part part)
        {
            parts.Add(part);
            SaveParts();
            return true;
        }

        public static bool EditPart(int partNumber, int serialNumber, Part updatedPart)
        {
            int index = FindPartIndex(partNumber, serialNumber);
            if (index != -1)
            {
                parts[index] = updatedPart;
                SaveParts();
                return true;
            }
            return false;
        }

        public static bool DeletePart(int partNumber, int serialNumber)
        {
            int index = FindPartIndex(partNumber, serialNumber);
            if (index != -1)
            {
                parts.RemoveAt(index);
                SaveParts();
                return true;
            }
            return false;
        }

        public static List<Part> GetAllParts()
        {
            return new List<Part>(parts);
        }

        public static int GetTotalStock()
        {
            return parts.Sum(p => p.Quantity);
        }
    }
}
