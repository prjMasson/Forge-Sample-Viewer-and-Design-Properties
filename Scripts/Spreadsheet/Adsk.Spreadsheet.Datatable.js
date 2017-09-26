//this script holds the function to work with the spreadsheet datatable

//panel in which table is displayed
var panel; 
//the data from the table
var table; var tableDiv;
var dataset; var columns =[];

//spreadsheet.datatable holds all the function related to the datatable from the design properties
function Adsk_Spreadsheet_Datatable(_dataset, _properties) {
    dataSet = _dataset;
    columns = [];

    console.log('Datatable is getting created');
    setTableColumns(_properties);
    //openDataTableInJSPanel();
    //openDataTableInOtherWindow();
    dataTableAtBottomOfWindow();
    dataTable();

    //add the button for controlling the visibility of columns
    columnButtons();

    //handling selections in the table returning dbIds from all selected rows for coloration
    table.on('select', function (e, dt, type, indexes) {
        if (type === 'row') {
            var data = table.rows('.selected').data()
            var id = []; data.map(function (a) { id.push( a.dbId); });
            setColorByIds(id);
        }
    });

    //handling column selection, we will create a chart when someone clicks on the column
    table.on('order.dt', function () {

        if (!table) { return;}
        var order = table.order(); if (order.length == 0) { return;}
        // get the column data 
        var columnId = order[0][0]; var title = table.column(columnId).header().innerText;
        var values = table.column(columnId, {search:'applied'}).data();
        var visibleRows = table.rows({search: 'applied'} ).cache();
        var ids = table.rows({ search: 'applied' }).cache().data().map(
            function (a) { return a.dbId; });
        createChartfromTableData(values, ids, title);
    });


    function dataTable() {
        //if table is already existing destroy to recreate, happens when browsing multiple designs
        if (table) {
            table.destroy();
            tableDiv.empty();
            table = undefined;
        }

        //if dataset too long then defer update, enable paging
        var defer = false; var pageLength = 500; pagingenabled = false;
        if (dataSet.length > 250) {
            defer = true; pageLength = 50; pagingenabled = true;
        }

        table = tableDiv.DataTable({
            data: dataSet,
            columns: columns,
            select: true,
            //scrollY: "300px",
            //scrollX:true,
            //paging: pagingenabled,
            pageLength: 50,
            deferRender: defer
        });

        //enable scroll in the parent jsPanel
        var jsPan = panel[0].parentNode;
        jsPan.style.overflow = "scroll";

       // table.colums = columns;
        
    };

    function setTableColumns(_properties) {
        for (var i = 0; i < _properties.length; i++) {
            var obj = { data: _properties[i] };
            obj["defaultContent"] = "";
            obj["title"] = _properties[i];
            columns.push(obj);
        }
    }



    //enable the buttons for column visibility 
    function columnButtons() {

        new $.fn.dataTable.Buttons( table, {
            name: 'commands',
            buttons: ['colvis']
        } );

        table.buttons().container().appendTo($('#columnSelector', panel.content));
    }

    function dataTableAtBottomOfWindow() {
        panel = $('#designProperties');
        tableDiv = $('#propertyTable',panel);
    }
};


//adding rows afterwards if loading everything at first time is slow
//adding rows after dtable creation, we refresh the table once the process of loading data is finished
function addRowsInBulkToTable(data, columns, finished) {

    table.rows.add(data);
        table.draw();
}

//managing the datatable in a popup window for better experience
function openDataTableInOtherWindow() {
    //close the panel if already existing
    if (panel) { panel.close(); }

    panel = window.open("Scripts/Spreadsheet/propertyTable.html");
    //panel.addEventListener('load', onPanelLoad, false);
    panel[panel.addEventListener ? 'addEventListener' : 'attachEvent'](
    (panel.attachEvent ? 'on' : '') + 'load', onPanelload, false);

}

//managing datatable in a jspanel
function openDataTableInJSPanel() {
    //close the panel if already existing
    if (panel) { panel.close(); }

    //open the properties in a new panel using jspanel
    panel = $.jsPanel({
        selector: '#designProperties',
        content: "<div id='designProperties' class='designProperties' style='height: 233px'>" +
        "<table id='propertyTable' class='display' width='80%'></table>" +
         "<div id='columnSelector' class='columnSelector' width='20%'></div>",
        position: { top: 150, left: 410 },
        title: "content: HTML",
        theme: "light"
    });

    //set the table div inside the panel
    tableDiv = $('#propertyTable', panel.content);
};