$(function() {
  $("#modal-button").click(function(){
    $('.modal').modal('show');
  });
  $(".modal").on("shown.bs.modal", function(){
    $.ajax({
      url: "",
      type: 'GET',
      data: {modal: true},
      success: function(res) {
        //Populate the modal with html returned by render. This works because render returns an HttpResponse
        document.getElementById("modal-body").innerHTML = res;
      }
    });
  });
  $(".close").click(function(){
    $(".modal").modal("hide");
  });
});