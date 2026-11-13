namespace TowerFlowWinForm
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            components = new System.ComponentModel.Container();
            Part_ManagementBox = new GroupBox();
            btnDeletePart = new Button();
            btnEditPart = new Button();
            btnListParts = new Button();
            btnCreatePart = new Button();
            groupBox2 = new GroupBox();
            btnTotalStock = new Button();
            partsGrid = new DataGridView();
            lblTotalStock = new Label();
            PartDetails = new GroupBox();
            txtQuantity = new TextBox();
            txtSerialNumber = new TextBox();
            txtPartNumber = new TextBox();
            txtRevision = new TextBox();
            txtName = new TextBox();
            label5 = new Label();
            label4 = new Label();
            label3 = new Label();
            label2 = new Label();
            label1 = new Label();
            refreshTimer = new System.Windows.Forms.Timer(components);
            Part_ManagementBox.SuspendLayout();
            groupBox2.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)partsGrid).BeginInit();
            PartDetails.SuspendLayout();
            SuspendLayout();
            // 
            // Part_ManagementBox
            // 
            Part_ManagementBox.Controls.Add(btnDeletePart);
            Part_ManagementBox.Controls.Add(btnEditPart);
            Part_ManagementBox.Controls.Add(btnListParts);
            Part_ManagementBox.Controls.Add(btnCreatePart);
            Part_ManagementBox.Location = new Point(12, 12);
            Part_ManagementBox.Name = "Part_ManagementBox";
            Part_ManagementBox.Size = new Size(109, 166);
            Part_ManagementBox.TabIndex = 0;
            Part_ManagementBox.TabStop = false;
            Part_ManagementBox.Text = "Part_Management";
            // 
            // btnDeletePart
            // 
            btnDeletePart.Location = new Point(13, 122);
            btnDeletePart.Name = "btnDeletePart";
            btnDeletePart.Size = new Size(75, 23);
            btnDeletePart.TabIndex = 3;
            btnDeletePart.Text = "Delete_Part";
            btnDeletePart.UseVisualStyleBackColor = true;
            btnDeletePart.Click += btnDeletePart_Click;
            // 
            // btnEditPart
            // 
            btnEditPart.Location = new Point(13, 93);
            btnEditPart.Name = "btnEditPart";
            btnEditPart.Size = new Size(75, 23);
            btnEditPart.TabIndex = 2;
            btnEditPart.Text = "EditPart";
            btnEditPart.UseVisualStyleBackColor = true;
            btnEditPart.Click += btnEditPart_Click;
            // 
            // btnListParts
            // 
            btnListParts.Location = new Point(13, 64);
            btnListParts.Name = "btnListParts";
            btnListParts.Size = new Size(75, 23);
            btnListParts.TabIndex = 1;
            btnListParts.Text = "ListPart";
            btnListParts.UseVisualStyleBackColor = true;
            btnListParts.Click += btnListParts_Click;
            // 
            // btnCreatePart
            // 
            btnCreatePart.Location = new Point(13, 35);
            btnCreatePart.Name = "btnCreatePart";
            btnCreatePart.Size = new Size(75, 23);
            btnCreatePart.TabIndex = 0;
            btnCreatePart.Text = "CreatePart";
            btnCreatePart.UseVisualStyleBackColor = true;
            btnCreatePart.Click += btnCreatePart_Click;
            // 
            // groupBox2
            // 
            groupBox2.Controls.Add(btnTotalStock);
            groupBox2.Location = new Point(152, 12);
            groupBox2.Name = "groupBox2";
            groupBox2.Size = new Size(145, 166);
            groupBox2.TabIndex = 1;
            groupBox2.TabStop = false;
            groupBox2.Text = "Inventory";
            // 
            // btnTotalStock
            // 
            btnTotalStock.Location = new Point(6, 35);
            btnTotalStock.Name = "btnTotalStock";
            btnTotalStock.Size = new Size(75, 23);
            btnTotalStock.TabIndex = 0;
            btnTotalStock.Text = "TotalStock";
            btnTotalStock.UseVisualStyleBackColor = true;
            btnTotalStock.Click += btnTotalStock_Click;
            // 
            // partsGrid
            // 
            partsGrid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            partsGrid.Location = new Point(453, 32);
            partsGrid.Name = "partsGrid";
            partsGrid.Size = new Size(335, 359);
            partsGrid.TabIndex = 2;
            // 
            // lblTotalStock
            // 
            lblTotalStock.AutoSize = true;
            lblTotalStock.Font = new Font("Segoe UI", 12F);
            lblTotalStock.Location = new Point(583, 9);
            lblTotalStock.Name = "lblTotalStock";
            lblTotalStock.Size = new Size(91, 21);
            lblTotalStock.TabIndex = 3;
            lblTotalStock.Text = "TotalStock:0";
            // 
            // PartDetails
            // 
            PartDetails.Controls.Add(txtQuantity);
            PartDetails.Controls.Add(txtSerialNumber);
            PartDetails.Controls.Add(txtPartNumber);
            PartDetails.Controls.Add(txtRevision);
            PartDetails.Controls.Add(txtName);
            PartDetails.Controls.Add(label5);
            PartDetails.Controls.Add(label4);
            PartDetails.Controls.Add(label3);
            PartDetails.Controls.Add(label2);
            PartDetails.Controls.Add(label1);
            PartDetails.Location = new Point(12, 205);
            PartDetails.Name = "PartDetails";
            PartDetails.Size = new Size(200, 243);
            PartDetails.TabIndex = 4;
            PartDetails.TabStop = false;
            PartDetails.Text = "Listing_Details";
            // 
            // txtQuantity
            // 
            txtQuantity.Location = new Point(94, 180);
            txtQuantity.Name = "txtQuantity";
            txtQuantity.Size = new Size(100, 23);
            txtQuantity.TabIndex = 13;
            // 
            // txtSerialNumber
            // 
            txtSerialNumber.Location = new Point(94, 143);
            txtSerialNumber.Name = "txtSerialNumber";
            txtSerialNumber.Size = new Size(100, 23);
            txtSerialNumber.TabIndex = 12;
            // 
            // txtPartNumber
            // 
            txtPartNumber.Location = new Point(94, 105);
            txtPartNumber.Name = "txtPartNumber";
            txtPartNumber.Size = new Size(100, 23);
            txtPartNumber.TabIndex = 11;
            // 
            // txtRevision
            // 
            txtRevision.Location = new Point(94, 66);
            txtRevision.Name = "txtRevision";
            txtRevision.Size = new Size(100, 23);
            txtRevision.TabIndex = 10;
            // 
            // txtName
            // 
            txtName.Location = new Point(94, 28);
            txtName.Name = "txtName";
            txtName.Size = new Size(100, 23);
            txtName.TabIndex = 9;
            // 
            // label5
            // 
            label5.AutoSize = true;
            label5.Location = new Point(0, 180);
            label5.Name = "label5";
            label5.Size = new Size(56, 15);
            label5.TabIndex = 8;
            label5.Text = "Quantity:";
            // 
            // label4
            // 
            label4.AutoSize = true;
            label4.Location = new Point(0, 143);
            label4.Name = "label4";
            label4.Size = new Size(87, 15);
            label4.TabIndex = 7;
            label4.Text = "Serial_Number:";
            // 
            // label3
            // 
            label3.AutoSize = true;
            label3.Location = new Point(0, 105);
            label3.Name = "label3";
            label3.Size = new Size(80, 15);
            label3.TabIndex = 6;
            label3.Text = "Part_Number:";
            // 
            // label2
            // 
            label2.AutoSize = true;
            label2.Location = new Point(0, 69);
            label2.Name = "label2";
            label2.Size = new Size(54, 15);
            label2.TabIndex = 5;
            label2.Text = "Revision:";
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Location = new Point(0, 31);
            label1.Name = "label1";
            label1.Size = new Size(42, 15);
            label1.TabIndex = 4;
            label1.Text = "Name:";
            // 
            // refreshTimer
            // 
            refreshTimer.Enabled = true;
            refreshTimer.Interval = 3000;
            refreshTimer.Tick += refreshTimer_Tick;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(PartDetails);
            Controls.Add(lblTotalStock);
            Controls.Add(partsGrid);
            Controls.Add(groupBox2);
            Controls.Add(Part_ManagementBox);
            Name = "Form1";
            Text = "Form1";
            Part_ManagementBox.ResumeLayout(false);
            groupBox2.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)partsGrid).EndInit();
            PartDetails.ResumeLayout(false);
            PartDetails.PerformLayout();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private GroupBox Part_ManagementBox;
        private Button btnCreatePart;
        private Button btnDeletePart;
        private Button btnEditPart;
        private Button btnListParts;
        private GroupBox groupBox2;
        private Button btnTotalStock;
        private DataGridView partsGrid;
        private Label lblTotalStock;
        private GroupBox PartDetails;
        private Label label5;
        private Label label4;
        private Label label3;
        private Label label2;
        private Label label1;
        private TextBox txtQuantity;
        private TextBox txtSerialNumber;
        private TextBox txtPartNumber;
        private TextBox txtRevision;
        private TextBox txtName;
        private System.Windows.Forms.Timer refreshTimer;
    }
}
