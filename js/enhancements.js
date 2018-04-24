jQuery( document ).ready(function( $ ) {
  $('.content-modal').on('click', function(event) {
    if($(event.target).is(".content-modal")) {
      // the hash doenst exists on the page, this way it closes the modal, but doesnt jump on the page
      window.location.hash = '#variants';
    }
  });


  setTimeout(function() {
    //$('.fotorama').fotorama();
    $('.fotorama')
        .on('fotorama:fullscreenenter fotorama:fullscreenexit', function (e, fotorama) {

        if (e.type === 'fotorama:fullscreenenter') {
            // Options for the fullscreen
            fotorama.setOptions({
                fit: 'contain',
            });
        } else {
            // Back to normal settings
            fotorama.setOptions({
                fit: 'cover'
            });
        }
        })
        .fotorama();

  },1000);



  $('.mobile-accordion-opener').on('click', function() {
    $(this).closest('.mobile-accordion').toggleClass('open');
  });

  $('.react-to-variant').click(function() {
    var variantValue = $(this).attr('data-variant-value');
    $('.variant-selector').val(variantValue);
    updateVariantTextareaPlaceholder();
  });

  $('.for-or-against-selector, .variant-selector').on('change', function() {
    updateVariantTextareaPlaceholder();
  });


  function updateVariantTextareaPlaceholder() {
    var placeholderTpl = "Ik ben {{forOrAgainst}} variant {{variant}}, want..";
    var forLabel = $('.for-or-against-selector').val() === 'against' ? 'tegen' : 'voor';
    placeholderTpl = placeholderTpl.replace('{{forOrAgainst}}', forLabel);
    placeholderTpl = placeholderTpl.replace('{{variant}}', $('.variant-selector').val());
    $('.argument-textarea').attr('placeholder', placeholderTpl);
  }

});
