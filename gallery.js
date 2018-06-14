// TO BE SORTED
$('a.popup-btn').magnificPopup({
    src: '#gallery-popup',    
    type: 'inline',
    midClick: true
});

// START APP
function GalleryModel(){
    this.imageList = [];
    this.collectionList = [];
    this.selectedCollection = [];
}

GalleryModel.prototype = {

init: function(){
    var self = this;
    self.getImages().then(function(images){
        self.images = images;
        self.collections = self.createCollectionList(self.images);
    });
},

getImages: function() {
    return $.ajax({
        type: 'GET',
        url: 'https://api.hubapi.com/hubdb/api/v2/tables/844364/rows?portalId=126868',//697229 | 844364
        dataFilter: function(rawData){
            var images = JSON.parse(rawData).objects.map(function(image, index){
                var newImage = {};
                newImage.src = image.values['2'];
                newImage.thumb = image.values['2'];
                newImage.alt = image.values['13'];
                newImage.desc = image.values['24'];
                newImage.collection = image.values['22'];
                newImage.isCover = image.values['3'].name == "T" ? true : false;
                newImage.solution = image.values['5'].name;
                newImage.style = image.values['6'].name;
                newImage.number = image.values['23'];
                newImage.marker = "My Blue Fuken Marker";
                return newImage;
            });
            return JSON.stringify(images);
        },
        success: function(images){/*Add functionality for success*/},
        error: function(error){/*console.log('error', error)*/;}
    });
},

//Group images into collections by collection name  
createCollectionList: function(imageList){
    var collectionList = {}; //Collections contianer object
    imageList.map( function(image){
        if(collectionList[image.collection]){//If the collection exists
            collectionList[image.collection].push(image); //Add the image into the collection
        } else {
            collectionList[image.collection] = [image]; //Create a new array that contains the current image 
        }
    });
    return collectionList;
},

getCollection: function(collectionId){
    var collection = this.collections[collectionId];
    if(collection){
        return collection;
    }else{
        console.log("Collection not found.");
        return false;
    }
    
}

};







// View
function GalleryView(model, containerSelector){
    this.model = model;
    this.containerSelector = containerSelector;
    this.init();
}
GalleryView.prototype = {
init: function() {
    this.getChildren().$selectInputs.niceSelect();
    // this.addButton();
},

getChildren: function(){
    this.$container = $(this.containerSelector);
    this.$collectionCards = this.$container.find('.gallery__img--card');
    this.$collectionCardGrid = this.$container.find('.gallery__img-grid');
    this.$gallerySidebar = $('#gallery-sidebar');
    this.$filterHeaders = this.$container.find('.gallery__filter-card--header, .gallery__filter-card--dropdown');
    this.$filterCheckboxEls = this.$container.find('.form-check');
    this.$filterCheckboxInputs = this.$container.find('.form-check input');
    this.$filterClearAllButton = this.$container.find('#clear-filters');
    this.$selectInputs = this.$container.find('select');
    this.$sortInput = this.$container.find('#sort-by');
    this.$searchInput = this.$container.find('#gallery-filter-search');

    return this;
},  

// //Displays the collection viewer.
// showGalleryViewer: function(galleryName){
//     if(galleryName){
//      controller.gallery.open(galleryName,0);
//     }        
// },

    getfilterCheckboxInputs: function(){
        return this.filterCheckboxInputs;
    },

    addButton: function() {
        var mbTopBar = $('body div.mobx-holder div.mobx-ui div.mobx-top-bar');
        console.log('addbutton:', mbTopBar.selector);
        $(mbTopBar.selector).append('<p>Test</p>');
    }

};



//Controller
function GalleryController(model, view){
this.model = model;
this.view = view;
this.init();
}

GalleryController.prototype = {

init: function() {
    console.log(GalleryController.prototype.self = this);
    this.model.init();
    this.view.init();
    this.filter.init();
    this.viewer.init();
    this.stateManager();
    console.log('model',this.model);

},

stateManager: function() {
    var self = this,
        view = self.view;

    //Collection card click event
    view.$collectionCards.on('click', function(event){
        var collectionId = $(this).data('collectionName'),
        collection = self.model.getCollection(collectionId);
        self.viewer.handleCollectionCardClick(collectionId, collection); 
    });

    //FILTER EVENT LISTENERS

    //Filter Card header click event
    view.$filterHeaders.on("click", function(e) {
        $(e.target).next('.gallery__filter-card--body').slideToggle('400');
    });
    
    //Filter form change event
    view.$filterCheckboxEls.unbind().on('click', function(event){
        var filterValue;
        if(event.target.tagName != "INPUT"){
            var $checkbox = $(event.currentTarget).find('input[type="checkbox"]')
            $checkbox.prop("checked", !$checkbox.prop("checked"));
        }

        //create filter value string based on selected checkboxes
        filterValue = view.$filterCheckboxInputs.filter(':checked').toArray().map(function(filter){return filter.value;}).join("");
        self.filter.update({filter:filterValue});
    });

    view.$searchInput.on('keyup', function(event){
        var _self = this;
        setTimeout(function(){
            self.filter.search($(_self).val()); 
            console.log('triggered');
        }, 500 );
        
    });
    
    //"Clear all" (filters) button click event
    view.$filterClearAllButton.on('click', function() {
        view.$filterCheckboxInputs.removeAttr('checked');
        view.$searchInput.val('');
        self.filter.update({filter:'*'});
    });

    //sorting popular & newest
    view.$sortInput.on('change', function() {
        var selectedValue = $(this).find('option:selected').val();
        self.filter.update({ sortBy: selectedValue});
    });

},


filter: {

    init: function(){
        var self = GalleryController.prototype.self;
        var $collectionGrid = self.view.$collectionCardGrid;
    
        this.isoFilter = $collectionGrid.isotope({
            itemSelector: '.gallery__img--card',
            layoutMode: 'fitRows',
            fitRows: { gutter: 20 },
            getSortData: {
                popular: function(itemElem){
                    return $(itemElem).data("popularSort");
                },
                arrival: function(itemElem){
                    return $(itemElem).data('arrivalSort');
                }
            },
            sortBy: 'popular',
            sortAscending: true
        });
    },

    update: function(filterOptions){
        if(!this.gridFilter){ this.init(); }
        this.isoFilter.isotope(filterOptions);
    },

    search: function(queryString){
        qsRegex = new RegExp(queryString, 'gi');

        function queryFn() {
            return function(){
                    console.log('Search: ', $(this).attr('class').match( qsRegex ));
                    return qsRegex ? $(this).attr('class').match( qsRegex ) : true; 
                };
        }
        this.isoFilter.isotope({filter: queryFn()});

        // debounce( this.isoFilter.isotope({filter:queryFn()}), 2500 );

        // function debounce( fn, threshold ) {
        //     var timeout;
        //     threshold = threshold || 100;

        //     return function debounced() {
                
        //         clearTimeout( timeout );
        //         var args = arguments;
        //         var _this = this;
        //         function delayed() {
        //             fn.apply( _this, args );
        //         }
        //         timeout = setTimeout( delayed, threshold );
        //     };
        // }
        
    }
},

viewer: {

    init: function(){
        this.gallery = new ModuloBox({
            controls : ['zoom', 'play', 'fullScreen', 'share', 'close'],
            prevNext: true
        });
        this.gallery.init();
    },

    handleCollectionCardClick: function(collectionId, collection){

        if(this.gallery.galleries[collectionId]==undefined){
            this.gallery.addMedia(collectionId, collection);
        }
        this.gallery.open(collectionId, 0);
    }
}

};

function GalleryApp(selector){
    this.model = new GalleryModel(),
    this.view = new GalleryView(this.model, selector),
    this.controller = new GalleryController(this.model, this.view);
}

(function(){
'use strict';
var gallery = new GalleryApp('#km-gallery');
}());