//This file contains the application for the TowerFlow inventory system software in a Windows Forms environment
//Once again press Ctrl+F5 to run the program without debugging
//Press F5 to run the program with debugging



namespace TowerFlowWinForm
{
    public partial class TowerFlow_NamePanel : Form
    {
        private string filter = "";
        public TowerFlow_NamePanel()
        {
            InitializeComponent();
            PartData.LoadParts();
            RefreshGrid();
            InstallAzureGuide();
        }

        // Dulskinator96 — Azure: scoped solely to KuroKage's native inventory window.
        // Add controls at runtime so William's designer-generated layout remains unchanged.
        private void InstallAzureGuide()
        {
            ClientSize = new Size(800, 615);
            var panel = new GroupBox
            {
                Name = "azureStockGuide",
                Text = "KuroKage — Azure Stock Guide  |  Dulskinator96: Azure",
                Location = new Point(12, 455),
                Size = new Size(776, 145)
            };
            var prompt = new TextBox
            {
                Name = "azureCommand",
                Location = new Point(12, 27),
                Size = new Size(604, 27),
                PlaceholderText = "Try: low stock | find Adapter | sort quantity | set 123/456789 to 8"
            };
            var execute = new Button
            {
                Name = "azureExecute",
                Text = "Ask Azure",
                Location = new Point(628, 26),
                Size = new Size(130, 30)
            };
            var answer = new TextBox
            {
                Name = "azureAnswer",
                ReadOnly = true,
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                Location = new Point(12, 65),
                Size = new Size(746, 66),
                Text = "Offline stock guide. Type help for supported commands. Inventory changes require confirmation."
            };
            void RunAzure(object? sender, EventArgs eventArgs)
            {
                try
                {
                    var advice = AzureStockGuide.Interpret(prompt.Text, PartData.GetAllParts());
                    answer.Text = advice.Message;
                    if (advice.DisplayParts is not null)
                        RefreshGrid(source: advice.DisplayParts);

                    if (advice.ProposedChange is not null)
                    {
                        var confirmed = MessageBox.Show(advice.Message + "\n\nApply this inventory change?",
                            "Azure — confirm stock change", MessageBoxButtons.YesNo,
                            MessageBoxIcon.Question) == DialogResult.Yes;
                        if (!confirmed)
                        {
                            answer.Text = "Canceled. Inventory unchanged.";
                            return;
                        }
                        bool saved = AzureStockGuide.Apply(advice.ProposedChange);
                        answer.Text = saved ? "Stock update saved. Inventory grid refreshed." :
                            "Not saved. Part changed, was removed, or could not be found.";
                        RefreshGrid();
                    }
                }
                catch (Exception ex)
                {
                    answer.Text = "Operation failed; verify current inventory before retrying: " + ex.Message;
                }
            }
            execute.Click += RunAzure;
            prompt.KeyDown += (sender, e) =>
            {
                if (e.KeyCode == Keys.Enter)
                {
                    e.SuppressKeyPress = true;
                    RunAzure(sender, e);
                }
            };
            panel.Controls.Add(prompt);
            panel.Controls.Add(execute);
            panel.Controls.Add(answer);
            Controls.Add(panel);
        }

        private void ClearInputs()
        {
            txtName.Clear();
            txtRevision.Clear();
            txtPartNumber.Clear();
            txtSerialNumber.Clear();
            txtQuantity.Clear();
        }

        private void RefreshGrid(string filter = "", IEnumerable<Part>? source = null)
        {
            var parts = source?.ToList() ?? PartData.GetPartsByName(filter);
            partsGrid.Rows.Clear();
            if (partsGrid.Columns.Count == 0)
            {
                partsGrid.Columns.Add("Name", "Name");
                partsGrid.Columns.Add("Revision", "Revision");
                partsGrid.Columns.Add("PartNumber", "Part Number");
                partsGrid.Columns.Add("SerialNumber", "Serial Number");
                partsGrid.Columns.Add("Quantity", "Quantity");
            }

            foreach (var part in parts)
            {
                partsGrid.Rows.Add(part.Name, part.Revision, part.PartNumber, part.SerialNumber, part.Quantity);
            }

            lblTotalStock.Text = $"Total Stock: {PartData.GetTotalStock()}";
        }

        private void btnListParts_Click(object sender, EventArgs e)
        {
            RefreshGrid();
        }

        private void btnTotalStock_Click(object sender, EventArgs e)
        {
            RefreshGrid();
        }

        private void btnCreatePart_Click(object sender, EventArgs e)
        {
            if (int.TryParse(txtRevision.Text, out int revision) &&
               int.TryParse(txtPartNumber.Text, out int partNumber) &&

               int.TryParse(txtQuantity.Text, out int quantity))
            {
                int serialNumber = PartUtils.GenRandomSerialNumber(); // generates a unique serial number per new part
                var newPart = new Part
                {
                    Name = txtName.Text,
                    Revision = revision,
                    PartNumber = partNumber,
                    SerialNumber = serialNumber,
                    Quantity = quantity
                };
                if (PartData.AddPart(newPart))
                {
                    MessageBox.Show("Part added successfully.");
                    RefreshGrid();
                    ClearInputs();
                }
                else
                {
                    MessageBox.Show("Failed to add part.");
                }
            }
            else
            {
                MessageBox.Show("Please enter valid numeric values for Revision, Part Number, and Quantity.");
            }

        }

        private void btnEditPart_Click(object sender, EventArgs e)
        {
            if (int.TryParse(txtPartNumber.Text, out int partNumber) &&
                int.TryParse(txtSerialNumber.Text, out int serialNumber) &&
                int.TryParse(txtRevision.Text, out int revision) &&
                int.TryParse(txtQuantity.Text, out int quantity))
            {
                var updatedPart = new Part
                {
                    Name = txtName.Text,
                    Revision = revision,
                    PartNumber = partNumber,
                    SerialNumber = serialNumber,
                    Quantity = quantity
                };
                if (PartData.EditPart(partNumber, serialNumber, updatedPart))
                {
                    MessageBox.Show("Part updated successfully.");
                    RefreshGrid();

                }
                else
                {
                    MessageBox.Show("Failed to update part. Make sure the part exists.");
                }
            }
            else
            {
                MessageBox.Show("Please enter valid numeric values for Revision, Part Number, Serial Number, and Quantity.");
            }

        }

        private void btnDeletePart_Click(object sender, EventArgs e)
        {
            if (!int.TryParse(txtPartNumber.Text, out int partNumber) ||
                !int.TryParse(txtSerialNumber.Text, out int serialNumber))
            {
                MessageBox.Show("Please enter valid numeric values for Part Number and Serial Number.");
                return;
            }
            // ClearInputs();
            bool success = PartData.DeletePart(partNumber, serialNumber);
            if (!success)
            {
                MessageBox.Show("Failed to delete part. Make sure the part exists.");
            }
            else
            {
                MessageBox.Show("Part deleted successfully.");
                RefreshGrid();
                ClearInputs();
            }

        }

        // private void refreshTimer_Tick(object sender, EventArgs e)
        //{
        //  PartData.LoadParts();
        //RefreshGrid();
        //}

        private void btnSearch_Click(object sender, EventArgs e)
        {
            RefreshGrid(txtSearchBar.Text);
        }

        private void btnQuit_Click(object sender, EventArgs e)
        {
            bool confirmQuit = MessageBox.Show("Are you sure you want to quit?", "Confirm Quit", MessageBoxButtons.YesNo) == DialogResult.Yes;

            if (confirmQuit)
            {
                Application.Exit();
            }
        }
    }
}
