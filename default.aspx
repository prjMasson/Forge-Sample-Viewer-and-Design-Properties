<%@ Page Async="true" Language="C#" AutoEventWireup="true" CodeBehind="default.aspx.cs" Inherits="DataManagementSample._default" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
  <title>Forge Tools</title>
  <link runat="server" rel="shortcut icon" href="~/favicon.ico" type="image/x-icon" />
  <link runat="server" rel="icon" href="~/favicon.ico" type="image/ico" />

  <link rel="stylesheet" href="https://developer.api.autodesk.com/modelderivative/v2/viewers/style.min.css?v=v2.17" type="text/css" />
  <script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/three.min.js?v=v2.17"></script>
  <script src="https://developer.api.autodesk.com/modelderivative/v2/viewers/viewer3D.min.js?v=v2.17"></script>

  <!-- loading Bootstrap and jQuery  -->
  <link href="Content/bootstrap.min.css" rel="stylesheet" />
  <link href="Content/jsTree/themes/default/style.min.css" rel="stylesheet" />
  <script src="Scripts/Libraries/jquery-3.1.1.min.js"></script>
  <script src="Scripts/Libraries/bootstrap.min.js"></script>
  <script src="Scripts/Libraries/bootstrap-select.min.js"></script>
  <link href="Content/bootstrap-select.min.css" rel="stylesheet" />

  <!-- loading jstree related  -->
  <script src="Scripts/Libraries/jsTree3/jstree.min.js"></script>
  <script src="Scripts/DataManagementTree.js"></script>
  <script src="Scripts/ForgeViewer.js"></script>
  <script src="Scripts/Libraries/clipboard.min.js"></script>
  <link href="Content/Main.css" rel="stylesheet" />

  <script src="Scripts/Libraries/Blob.js"></script>
  <script src="Scripts/Libraries/FileSaver.min.js"></script>
  <script src="Scripts/Libraries/xlsx.core.min.js"></script>


    <!-- loading extensions for spreadsheet, datatable with select extension and jsPanel -->
    <link rel="stylesheet" href="Scripts/Spreadsheet/jsPanel/jquery.jspanel.min.css">
    <script src="Scripts/Spreadsheet/jsPanel/jquery.jspanel-compiled.min.js"></script>
    <link rel="stylesheet" type="text/css" href="Scripts/Spreadsheet/DataTable/datatables.min.css">
    <script type="text/javascript" charset="utf8" src="Scripts/Spreadsheet/DataTable/datatables.min.js"></script>
    <link rel="stylesheet" href="Scripts/Spreadsheet/DataTable/select.dataTables.min.css">
    <script src="Scripts/Spreadsheet/DataTable/dataTables.select.min.js"></script>
    <script src="Scripts/Spreadsheet/DataTable/dataTables.buttons.min.js"></script>
    <link rel="stylesheet" href="Scripts/Spreadsheet/DataTable/buttons.dataTables.min.css">
    <script src="Scripts/Spreadsheet/DataTable/buttons.colVis.min.js"></script>
     <script src="Scripts/Spreadsheet/Chart/Chart.min.js"></script>
    <script src="Scripts/Spreadsheet/Chart/kMeans.js" ></script>
    
    <!-- Spreadsheet Extension -->
    <script src="Scripts/Spreadsheet/async.min.js"></script>
    <script src="Scripts/Spreadsheet/Adsk.Spreadsheet.Colors.js"></script>
    <script src="Scripts/Spreadsheet/Adsk.Spreadsheet.Charts.js"></script>
    <script src="Scripts/Spreadsheet/Adsk.Spreadsheet.Datatable.js"></script>
    <script src="Scripts/Spreadsheet/Adsk.Spreadsheet.js"></script>

    <!-- Script to set the variables for the jsPanel layout -->
    <script>
        baseOffsetY = 50;
        panelPadding = 5;
        function pixWindow(factor, height) {
            if (height) {
                return Math.round(($(window).height()-baseOffsetY-panelPadding) / factor);
            }
            else { return Math.round(($(window).width()-panelPadding*2) / factor); }
        }
        dmPanelWidth = pixWindow(6, false); dmPanelHeight = pixWindow(1.9, true) ;
        colorTheme = "#0696d7";
        viewerPanelHeight = pixWindow(2.2, true);
        viewerPanelWidth = pixWindow(1, false) - dmPanelWidth;
        dataTableHeight = pixWindow(1.02, true) - viewerPanelHeight;
        chartPanelHeight = pixWindow(1.02, true) - dmPanelHeight;
        padd = "1px"; 


</script>


</head>
<body>
  <form id="form1" runat="server"></form>

  <nav class="navbar navbar-default navbar-fixed-top">
    <div class="container-fluid">
      <ul class="nav navbar-nav left">
        <li>
          <a href="https://enterprisehub.autodesk.com/" target="_blank">
            <img alt="Autodesk Enterprise Hub" src="/Images/top-logo.png" height="15" />
               &emsp; &emsp; Forge Sample App // Viewing and browsing design Properties
          </a>
        </li>
      </ul>
    </div>
  </nav>

<!-- Using JSPanel for DataManagement Tree -->
<script>
    $.jsPanel({
        id: 'dataManagement',
        position: { my: "left-top", at: "left-top", offsetY: baseOffsetY },
        theme: colorTheme,
        panelSize: { width: dmPanelWidth, height: dmPanelHeight },
        headerTitle: "Autodesk 360 Hubs",
        content: "<div id='dataManagementHubs' class='dataManagementHubs'>" +
    'tree here' + "</div>",
        //headerControls: {smallify: 'remove', close: 'remove', maximize: 'remove'},
        dragit: { disable: true },
        headerControls: { controls: 'none' },
        resizeit: {handles: 's'},
        callback: function () {this.content.css("padding", padd);}
    });

</script>
<!-- End of JSPanel for DataManagement Tree -->

<!-- Using JSPanel for ForgeViewer -->
<script>   
    $.jsPanel({
        position: { my: "left-top", at: "left-top", offsetY: baseOffsetY, offsetX: dmPanelWidth+panelPadding },
        theme: colorTheme,
        panelSize: { width: viewerPanelWidth, height: viewerPanelHeight },
        headerRemove: true,
        headerTitle: "Forge Viewer",
        border: "2px solid",
        content:   "<div id='forgeViewer' class='forgeviewer'> <div> </div> </div>",
        dragit: { disable: true },
        resizeit: { handles: 's' },
        callback: function () { this.content.css("padding", padd); }
    });

</script>
<!-- End of JSPanel for ForgeViewer -->

<!-- Using JSPanel for DesignPropertiesDatatable -->
<script>
        $.jsPanel({
            position: { my: "left-top", at: "left-top", offsetY: baseOffsetY + viewerPanelHeight+panelPadding , offsetX: dmPanelWidth+panelPadding },
            theme: "#0696d7",
            panelSize: { width: viewerPanelWidth, height: dataTableHeight },
            overflow: 'scroll',
            headerRemove: true,
            border: "2px solid",
            headerTitle: "Design Properties",
            content:"<div id='designProperties' class='designProperties' >"+
        "<table id='propertyTable' class='display' width='100%'></table>" +
     "<div id='columnSelector' class='columnSelector' width='100%'></div></div>",
            dragit: { disable: true },
            resizeit: { handles: 'n' },
            callback: function () { this.content.css("padding", padd); }
        });

</script>
<!-- End of JSPanel for DesignPropertiesDatatable -->

<!-- Using JSPanel for Charts -->
<script>
    $.jsPanel({
        id: 'chartPanel',
        position: { my: "left-top", at: "left-top", offsetY: baseOffsetY + dmPanelHeight + panelPadding },
        theme: colorTheme,
        panelSize: { width: dmPanelWidth, height: chartPanelHeight },
        headerTitle: "Chart tab",
        content: "<div id='Charts' class='charts'>" +
 "</div>",
        dragit: { disable: true },
        resizeit: { handles: 'n' },
        headerControls: { controls: 'none' },
        callback: function () { this.content.css("padding", padd); }
    });

</script>
<!-- End of JSPanel for DataManagement Tree -->

</body>
</html>
