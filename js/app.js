  var config = getLibrary().config
  var objAssess = getAssessmentObj()

  var qTemplate = '<legend>${description}</legend>' +
    '{{each fields}}' +
      '<p>' +
        '<label class="${labelClass} question">' +
          '<input type="${q_type}" class="${inputClass} question" data-q_group="${q_group}" name="opt${c_short_name}" id="opt${q_id}" value="${value}">' +
          '${q_text}' +
        '</label>' +
      '</p>' +
    '{{/each }}'
  $.template('qTemplate', qTemplate)



  function renderStep(idx) {
    // get values saved values
    var step = objAssess[idx]

    // if the fields have not been previously populated...populate
    if (step.fields.length == 0) {
      data = {
        'id': 'Question',
        'function': 'getQTemplate',
        'q_category_id': idx + 1
      }

      ajax(data)
        .done(function(result) {
          step.fields = result.fields
          step.description = result.description
          displayStep(step, idx)
        })
    }
  }

  function displayStep(step, idx) {
    var selector = "h3:contains('" + step.category + "')"
    element = $(selector).next('fieldset')[0]
    $(element).empty()
    $.tmpl("qTemplate", step).appendTo(element)

    $('input:checkbox').bootstrapToggle({
      "on": "Yes",
      "off": "No"
    });
  }

  function recordState(idx) {
    // record the state of the current step
    frmInputs = $('.body.current').find('input')
    legendText = $('.body.current').find('legend')[0].innerText
    fields = []

    category = objAssess[idx].category
    $.each(frmInputs, function(k, v) {
      obj = {}
      q_id = this.id.match(/\d+/)[0] || null
      tmpText = this.closest('label').innerText
      q_text = tmpText.replace(/YesNo/g, '')
      obj.c_short_name = category
      obj.inputType = this.type
      obj.labelClass = this.closest('label').className
      obj.q_group = this.dataset.q_group
      obj.q_id = q_id
      obj.q_name = q_id
      obj.q_text = q_text
      obj.q_type = this.type
      obj.value = this.value
      obj.checked = this.checked
      fields.push(obj)
    })

    objAssess[idx].description = legendText
    objAssess[idx].fields.length = 0
    objAssess[idx].fields = fields
    say(objAssess[idx])
  }
  //
  // function restoreState(idx) {
  //   // restore the state of the current stepo
  //   step = objAssess[idx]
  //   if (step.fields.length > 0) {
  //     // remove description
  //     $.each(step.fields, function(k, v) {
  //       $("opt" + this.q_id).prop('checked', this.checked)
  //     })
  //   }
  // }

  function deleteQuestion(evt) {
    say(evt)
  }

  function editQuestion(rec) {
    // set up question editing form
    $('#q_id').val(rec.q_id)
    $("#q_category_id option[value='" + rec.q_category_id + "']")
      .prop("selected", "selected")

    $('#q_text').val(rec.q_text)
    w2ui.adminForm.toolbar.show('update')
    w2ui.adminForm.toolbar.hide('save')
  }

  (function() {
    $().w2layout(config.poplayout);
    $('#adminQuestion').w2form(config.adminForm);
    $('body').w2layout(config.mainLayout);
    $('#question_grid').w2grid(config.grid_questions);
    $('#g_question').w2grid(config.grid_questionGroup);
  })()

  // adminForm events
  w2ui.adminForm.on('*', function(evt) {
    console.log('Event: ' + evt.type, 'Target: ' + evt.target, evt);

    // question group functionality
    if (evt.type == 'change' && evt.target == 'yn_group') {
      // show/hide multi-question grid
      var isChecked = $('#yn_group').is(':checked');
      $('#priority').toggle(isChecked)
      if (isChecked) {
        $('#q_priority').spinner()
        this.toolbar.show('more')
      } else {
        this.toolbar.hide('more')
    }
    }
  })

  function resizeJquerySteps() {
    $('.wizard .content').animate({
      height: $('.body.current').outerHeight()
    }, "slow");
  }

  $('form').validate({
    submitHandler: function(form) {
      saveForm(form)
    }
  });
  // w2utils.settings.dataType = 'JSON'
  var form = $("#assessment-form").show();
  form.steps({
    headerTag: "h3",
    bodyTag: "fieldset",
    transitionEffect: "fade",
    stepsOrientation: "vertical",
    autoFocus: true,
    onInit: function(event, currentIdx) {
      renderStep(currentIdx)
      return true;
    },
    onStepChanging: function(event, currentIdx, newIdx) {
      recordState(currentIdx)
      scoreAssessment()
      return true;
    },
    onStepChanged: function(event, currentIdx, prevIdx) {
      renderStep(currentIdx)
      // restoreState(currentIdx)
      resizeJquerySteps();
    },
    onFinished: function(event, currentIdx) {
      scoreAssessment()
      return true;
    }
  });

  $('#btnTest').click(function() {
    // populate graph with random values
    data = populateData()
    updateGraph(data);
    say(data)
  })
