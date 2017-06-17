var question_data, arrCatText = [];
var addQuestionForm = "#addQuestion_Question"

function say(text) {
  if ($('#alert').is(":checked")) alert(JSON.stringify(text, 4, null));
  // console.trace()
  if (typeof text == 'array') {
    console.table(text);
  } else if (typeof text == 'object') {
    console.dir(text);
  } else {
    console.log(text);
  }
}

function getAssessmentObj() {
  return [{
    category: 'Accuracy',
    fields: []
  }, {
    category: 'Strength',
    fields: []
  }, {
    category: 'Speed',
    fields: []
  }, {
    category: 'Social Aspects',
    fields: []
  }, {
    category: 'Practice',
    fields: []
  }, {
    category: 'Improvisation',
    fields: []
  }, {
    category: 'Repertoire',
    fields: []
  }, {
    category: 'Fretboard',
    fields: []
  }]
}

function loadCategories() {
  // load category dropdowns
  var data = [{
      "name": "function",
      "value": "getCategories"
    },
    {
      "name": "id",
      "value": "Category"
    }
  ]
  ajax(data)
    .done(function(result) {

      arrCatText.length = 0;
      // create cookie using user info
      $.each(result, function() {
        $("select[name*='category']").append(
          new Option(this.c_text, this.c_id)
        )
        arrCatText.push(this.c_text)
      })

    })
}

function searchData(searchTerm, dataObj, searchValue = "Code") {
  // search for code node and return index
  var retVal;

  $.each(dataObj, function(idx, val) {
    if (val[searchValue].indexOf(searchTerm) > -1) {
      retVal = idx;
      return false;
    }
  });
  return retVal;
}

function getRand() {
  // get randome number between 0-9
  return Math.floor(Math.random() * 9)
}

function parseForm(data) {
  // sum the values of the form categories
  var paramObj = {};
  $.each(data, function(_, kv) {
    if (paramObj.hasOwnProperty(kv.name)) {
      paramObj[kv.name] += parseFloat(kv.value);
    } else {
      paramObj[kv.name] = parseFloat(kv.value);
    }
  });

  return paramObj;
}

function populateData(mergeData) {
  // get clean template of blank values
  var retArr = getData();

  if (mergeData == undefined) { // if no mergeData is provided randomize data
    $.each(retArr, function(idx, val) {
      val.Assessment = getRand();
    })
  } else {
    // loop through parsed values and merge with orig data
    $.each(mergeData, function(k, v) {
      idx = searchData(k, retArr)
      retArr[idx].Assessment += v;
    })
  }
  return retArr;
}

function updateGraph(graphData) {
  $.extend(true, config.chart, {
    dataProvider: graphData
  })

  genChart(config.chart);
  // say("You are submitting: " + JSON.stringify(graphData, 4, null));
}

function scoreAssessment() {
  // extract data summation from form data
  var dataValues = parseForm($('#assessment-form').serializeArray());

  // update template with form values
  var graphData = populateData(dataValues);

  // update graph with resultant data
  updateGraph(graphData);
}

function genChart(data, theme) {
  chart = AmCharts.makeChart("chartdiv", config.chart);
}

function getSnippet(destination, snippetId) {
  return $(destination).load('templates/html ' + snippetId)
}

function saveForm(frm) {
  // frm is the form selector ex: #form_name
  event.preventDefault()
  var data = $(frm).serializeArray()
  frmData = frm.split('_')
  data.push({
    "name": "id",
    "value": frmData[1]
  }, {
    "name": "function",
    "value": frmData[0].substring(1) // remove the '#' from the form selector
  })
  ajax(data)
    .done(function(result) {
      say(result)
    })
}

function ajax(data, callback) {
  return $.ajax({
      contentType: "application/x-www-form-urlencoded",
      data: data,
      type: "POST",
      url: "../../cgi-bin/wogi.py"
    })
    .done(function(result, textStatus, jqXHR) {
      if (typeof result == "string" || $.isEmptyObject(result)) {
        say("Error", result);
        say("Status", textStatus, jqXHR)
        say("XHR", jqXHR)
      } else {
        // run callback function if present
      }
      if (callback) callback()
    })
    .fail(function(jqXHR, textStatus, error) {
      var err = textStatus + ", " + error;
      say("Response: " + jqXHR.responseText);
      say("Request Failed: " + err);
    });
}

function clearQuestionForm() {
  // clear question text
  $('#q_text').val("")
  $('#q_priority').toggle(false)

  // hide/clear grid
  $('#g_question').toggle(false)
  w2ui.grid_questionGroup.clear()
  w2ui.grid_questionGroup.refresh()

  // uncheck group box
  $('#yn_group').prop('checked', false).change()

  // hide more button
  w2ui.adminForm.toolbar.hide('more')
  w2ui.adminForm.toolbar.hide('update')
  w2ui.adminForm.toolbar.show('save')

  // clear data
  question_data = [];
}

function addQuestion(val) {
  var idx = w2ui.grid_questionGroup.records.length
  w2ui.grid_questionGroup.clear()
  if (question_data == undefined) question_data = []
  question_data.push({
    recid: idx + 1,
    question: val
  })
  $('#q_text_group').val(JSON.stringify(question_data))
  w2ui.grid_questionGroup.add(question_data)
  w2ui.grid_questionGroup.refresh()
}

function showGrpQuestions() {
  $('#g_question')
    .toggle()
    .w2render(w2ui.grid_questionGroup)
}

function openPopup() {
  w2popup.open({
    title: 'Question Administration',
    width: 900,
    height: 600,
    showMax: true,
    body: '<div id="main" style="position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;"></div>',
    onOpen: function(event) {
      event.onComplete = function() {
        $('#w2ui-popup #main').w2render('poplayout');
        w2ui.poplayout.content('left', w2ui.grid_questions);
        w2ui.poplayout.content('main', w2ui.adminForm);
        loadCategories()
      };
    },
    onToggle: function(event) {
      event.onComplete = function() {
        w2ui.layout.resize();
      }
    }
  });
}

function activeRowRender(rec, idx, c_idx) {
  // check column logic
  checkCols = ['active', 'q_bool']
  currentField = this.columns[c_idx].field
  columnData = rec[currentField]
  if (checkCols.indexOf(currentField) > -1) {
    if (columnData) {
      chk = "<input type='checkbox' "
      chk += columnData === 1 ? "checked " : ""
      columnData = chk + " disabled='disabled' />"
    } else {
      columnData = "<input type='checkbox' disabled='disabled' /> "
    }
  }

  // active record logic
  return rec.active == 0 ? '<div class="inactive">' + columnData + '</div>' : columnData;
}

var config = {
  panelStyle: 'border: 1px solid #dfdfdf; padding: 5px;',
  adminForm: {
    name: 'adminForm',
    fields: [{
        name: 'q_category_id',
        id: 'q_category_id',
        type: 'select'
      },
      {
        name: 'q_id',
        id: 'q_id',
        hidden: true,
        type: 'text'
      },
      {
        name: 'q_text',
        id: 'q_text',
        type: 'text'
      },
      {
        name: 'q_priority',
        id: 'q_priority',
        hidden: true,
        required: true,
        type: 'text'
      },
      {
        name: 'yn_group',
        id: 'yn_group',
        type: 'checkbox'
      },
      {
        name: 'q_text_group',
        id: 'q_text_group',
        hidden: true,
        type: 'text'
      },
    ],
    onRefresh: function(event) {},
    toolbar: {
      items: [{
          type: 'spacer'
        },
        {
          type: 'button',
          id: 'reset',
          caption: 'Reset'
        },
        {
          type: 'button',
          id: 'more',
          caption: 'More',
          hidden: true
        },
        {
          type: 'button',
          id: 'save',
          caption: 'Save'
        },
        {
          type: 'button',
          id: 'update',
          hidden: true,
          caption: 'Update'
        },
      ],
      onClick: function(event) {
        if (event.target == 'reset') {
          clearQuestionForm()
        } else if (event.target == 'more') {
          var q_text = $('textarea[name="q_text"]')
          if (q_text.val() != "") {
            if ($('#g_question').is(":hidden")) showGrpQuestions()
            addQuestion(q_text.val())
            q_text.val("")
          } else {
            w2alert("You have not entered a question!");
          }
        } else if (event.target == 'save') {
          saveForm(addQuestionForm, function() {
            w2ui.grid_questions.reload()
          })
          clearQuestionForm()
        } else if (event.target == 'update') {
          var frmdata = $(addQuestionForm).serializeArray()
          frmdata.push({
            "name": "id",
            "value": 'Question'
          }, {
            "name": "function",
            "value": 'updateQuestion'
          })
          ajax(frmdata, function() {
              w2ui.grid_questions.reload()
            })
            .done(function() {
              clearQuestionForm()
            })
        }
      }
    }
  },
  poplayout: {
    name: 'poplayout',
    id: 'poplayout',
    padding: 4,
    panels: [{
        type: 'left',
        size: '50%',
        resizable: true,
        minSize: 400
      },
      {
        type: 'main',
        style: this.panelStyle,
        minSize: 400
      }
    ]
  },
  mainLayout: {
    name: 'layout',
    id: 'layout',
    panels: [{
        type: 'top',
        size: 50,
        style: this.panelStyle,
        content: '',
        toolbar: {
          items: [{
              type: 'menu-check',
              id: 'drpView',
              text: 'Open Panels: ',
              items: [{
                  text: 'Assessment',
                  id: 'main'
                },
                // {
                //   text: 'Administration',
                //   id: 'left'
                // },
                {
                  text: 'Assessment Chart',
                  id: 'right'
                },
                {
                  text: 'Preview Panel',
                  id: 'preview'
                },
                // {
                //   text: 'Bottom Panel',
                //   id: 'bottom'
                // },
              ],
              selected: ['main', 'right', 'preview'],
              onRefresh: function(event) {
                event.item.count = event.item.selected.length;
              },
            },
            {
              type: 'spacer'
            },
            {
              type: 'button',
              id: 'btnAdmin',
              text: "Administration"
            }

          ],
          onClick: function(event) {
            var availablePanels = ['top', 'main', 'left', 'right', 'preview', 'bottom']
            if (event.target !== 'drpView') {
              idx = event.target.indexOf(":")
              if (idx > -1) {
                panel = event.target.substring(idx + 1).toLowerCase()
                if (availablePanels.indexOf(panel) > -1) {
                  w2ui['layout'].toggle(panel, true)
                }
              } else {
                openPopup()
              }
            }
          }
        }
      },
      {
        type: 'main',
        size: '50%',
        resizable: true,
        style: this.panelStyle,
        content: $('#assessmentForm').html()
      },
      {
        type: 'right',
        size: '50%',
        resizable: true,
        style: this.panelStyle,
        content: $('#chartContainer').html()
      },
      {
        type: 'preview',
        size: 50,
        resizable: true,
        // hidden: true,
        style: this.panelStyle,
        content: $('#chart_controls').html()
      },
      //  { type: 'left', size: '50%', resizable: true,style: panelStyle, content: $('.container').html() , title: 'Administration', },
      {
        type: 'bottom',
        size: 50,
        resizable: true,
        hidden: true,
        style: this.panelStyle,
        content: ''
      }
    ]
  },
  chartData: [{
      "Category": "Accuracy",
      "Code": "optAccuracy",
      "Assessment": 0
    },
    {
      "Category": "Finger Strength",
      "Code": "optFStrength",
      "Assessment": 0
    },
    {
      "Category": "Speed",
      "Code": "optSpeed",
      "Assessment": 0
    },
    {
      "Category": "Frequency of Playing w/ Others",
      "Code": "optFrequency",
      "Assessment": 0
    },
    {
      "Category": "Consistent Practice Schedule",
      "Code": "optPractice",
      "Assessment": 0
    },
    {
      "Category": "Improvisation",
      "Code": "optImprov",
      "Assessment": 0
    },
    {
      "Category": "Song Repertoire",
      "Code": "optSongs",
      "Assessment": 0
    },
    {
      "Category": "Fretboard Knowledge",
      "Code": "optFretboard",
      "Assessment": 0
    }
  ],
  chart: {
    "type": "radar",
    "theme": "dark",
    "categoryField": "Category",
    "startDuration": 2,
    "graphs": [{
      "balloonText": "self-assessed value: [[value]]",
      "bullet": "round",
      "id": "AmGraph-1",
      "valueField": "Assessment"
    }],
    "guides": [],
    "valueAxes": [{
      "autoWrap": true,
      "axisTitleOffset": 20,
      "id": "ValueAxis-1",
      "minimum": 0,
      "axisAlpha": 0.15,
      "dashLength": 0
    }],
    "allLabels": [],
    "balloon": {},
    "titles": [],
    "dataProvider": function() {
      return this.chartData
    }
  },
  grid_questionGroup: {
    name: 'grid_questionGroup',
    columns: [{
        field: 'recid',
        caption: 'RecID',
        size: '60px'
      },
      {
        field: 'question',
        caption: 'Question',
        size: '60%'
      },
      {
        field: 'priority',
        caption: 'Priority',
        size: '20%'
      }
    ],
    records: []
  },
  grid_questions: {
    name: 'grid_questions',
    show: {
      toolbar: true,
      toolbarEdit: true,
      toolbarDelete: true,
      footer: true
    },
    url: '../../cgi-bin/wogi.py',
    postData: {
      "function": "getAllQuestions",
      "id": "Question"
    },
    onEdit: function(event) {
      editQuestion(this.get(event.recid))
    },
    onDelete: function(event) {
      deleteQuestion(this.get(event.recid))
    },
    onRender: function() {
      // this.searches[5].options.items = arrCatText
    },
    searches: [{
        field: 'q_text',
        caption: 'Question',
        type: 'text'
      },
      {
        field: 'q_type',
        caption: 'Display Type',
        type: 'list',
        options: {
          items: ['radio', 'checkbox']
        }
      },
      // { field: 'q_group', caption: 'In Group?', type: 'list', options: {items: ['0', '1']}},
      {
        field: 'active',
        caption: 'Active',
        type: 'int'
      },
      {
        field: 'q_group',
        caption: 'Group ID',
        type: 'int'
      },
      {
        field: 'priority',
        caption: 'Priority',
        type: 'int'
      } //,
      // { field: 'category', caption: 'Category', type: 'list', options: {items: arrCatText}}//,
      // { field: 'date_created', caption: 'Created', type: 'date'}
    ],
    columns: [{
        field: 'q_id',
        caption: 'RecID',
        sortable: true,
        // hidden: true,
        size: '5%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'q_text',
        caption: 'Question',
        size: '40%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'q_type',
        caption: 'Display Type',
        hidden: true,
        sortable: true,
        size: '15%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'q_bool',
        caption: 'In Group?',
        size: '10%',
        sortable: true,
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'priority',
        caption: 'Priority',
        size: '10%',
        sortable: true,
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'q_group',
        caption: 'Group ID',
        sortable: true,
        hidden: true,
        size: '10%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'category',
        caption: 'Category',
        sortable: true,
        size: '10%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'active',
        caption: 'Active',
        sortable: true,
        size: '5%',
        attr: 'align="center"',
        render: activeRowRender
      },
      {
        field: 'date_created',
        caption: 'Created',
        hidden: true,
        sortable: true,
        size: '15%',
        attr: 'align="center"',
        render: activeRowRender
      }
    ],
    records: []
  }
}

function getData() {
  // create inital data template
  return [{
      "Category": "Accuracy",
      "Code": "optAccuracy",
      "Assessment": 0
    },
    {
      "Category": "Finger Strength",
      "Code": "optFStrength",
      "Assessment": 0
    },
    {
      "Category": "Speed",
      "Code": "optSpeed",
      "Assessment": 0
    },
    {
      "Category": "Frequency of Playing w/ Others",
      "Code": "optFrequency",
      "Assessment": 0
    },
    {
      "Category": "Consistent Practice Schedule",
      "Code": "optPractice",
      "Assessment": 0
    },
    {
      "Category": "Improvisation",
      "Code": "optImprov",
      "Assessment": 0
    },
    {
      "Category": "Song Repertoire",
      "Code": "optSongs",
      "Assessment": 0
    },
    {
      "Category": "Fretboard Knowledge",
      "Code": "optFretboard",
      "Assessment": 0
    }
  ]
}

function getLibrary() {
  return {
    config: config
  }
}
