define([
    'Backbone',
    'jQuery',
    'Underscore',
    'views/listViewBase',
    'text!templates/Holiday/list/ListHeader.html',
    'text!templates/Holiday/list/cancelEdit.html',
    'views/Holiday/CreateView',
    'views/Holiday/list/ListItemView',
    'models/HolidayModel',
    'collections/Holiday/filterCollection',
    'collections/Holiday/editCollection',
    'dataService',
    'constants',
    'async',
    'moment'
], function (Backbone,
             $,
             _,
             ListViewBase,
             listTemplate,
             cancelEdit,
             CreateView,
             ListItemView,
             CurrentModel,
             contentCollection,
             EditCollection,
             dataService,
             CONSTANTS,
             async,
             moment) {
    'use strict';

    var HolidayListView = ListViewBase.extend({
        page          : null,
        sort          : null,
        listTemplate  : listTemplate,
        ListItemView  : ListItemView,
        contentType   : CONSTANTS.HOLIDAY, // needs in view.prototype.changeLocationHash
        changedModels : {},
        holidayId     : null,
        editCollection: null,

        initialize: function (options) {
            $(document).off('click');

            this.CreateView = CreateView;
            this.CurrentModel = CurrentModel;

            this.startTime = options.startTime;
            this.collection = options.collection;
            this.parrentContentId = options.collection.parrentContentId;
            this.sort = options.sort;
            this.filter = options.filter;
            this.page = options.collection.currentPage;
            this.contentCollection = contentCollection;

            this.render();
        },

        events: {
            'click .checkbox'      : 'checked',
            'click td.editable'    : 'editRow',
            'click .oe_sortable'   : 'goSort',
            'change .editable '    : 'setEditable',
            'keydown input.editing': 'setChanges'
        },

        saveItem: function () {
            var self = this;
            var model;
            var modelJSON;
            var date;
            var id;
            var errors = this.$el.find('.errorContent');
            var keys = Object.keys(this.changedModels);

            var filled = true;

            $('.editable').each(function (index, elem) {
                if (!$(elem).html()) {
                    filled = false;
                    return false;
                }
            });

            if (!filled) {
                return App.render({type: 'error', message: 'Fill all fields please'});
            }

            this.setChangedValueToModel();

            keys.forEach(function (id) {
                model = self.editCollection.get(id) || self.collection.get(id);
                modelJSON = model.toJSON();
                date = new Date(modelJSON.date);
                model.changed = self.changedModels[id];
                if (!self.changedModels[id].date) {
                    model.changed.date = date;
                }
                model.changed.year = moment(date).isoWeekYear();
                model.changed.week = moment(date).isoWeek();
            });

            if (errors.length) {
                return;
            }
            this.editCollection.save();

            keys.forEach(function (id) {
                delete self.changedModels[id];
                self.editCollection.remove(id);
            });
        },

        editRow: function (e) {
            var el = $(e.target);
            var tr = $(e.target).closest('tr');
            var holidayId = tr.data('id');
            var colType = el.data('type');
            var isDTPicker = colType !== 'input' && el.prop('tagName') !== 'INPUT';
            var tempContainer;
            var width;

            if (holidayId && el.prop('tagName') !== 'INPUT') {
                if (this.holidayId) {
                    this.setChangedValueToModel();
                }
                this.holidayId = holidayId;
            }

            if (isDTPicker) {
                tempContainer = (el.text()).trim();
                el.html('<input class="editing" type="text" value="' + tempContainer + '"  maxLength="255">');
                this.$el.find('.editing').datepicker({
                    dateFormat : 'd M, yy',
                    changeMonth: true,
                    changeYear : true
                });
            } else {
                tempContainer = el.text();
                width = el.width() - 6;
                el.html('<input class="editing" type="text" value="' + tempContainer + '"  maxLength="255" style="width:' + width + 'px">');
            }

            return false;
        },

        render: function () {
            var self = this;
            var $currentEl = this.$el;
            $('.ui-dialog ').remove();

            $currentEl.html('');
            $currentEl.append(_.template(listTemplate));
            $currentEl.append(new ListItemView({
                collection : this.collection,
                page       : this.page,
                itemsNumber: this.collection.namberToShow
            }).render()); // added two parameters page and items number

            setTimeout(function () {
                self.editCollection = new EditCollection(self.collection.toJSON());
                self.editCollection.on('saved', self.savedNewModel, self);

                self.editCollection.on('updated', self.updatedOptions, self);

                self.$listTable = $('#listTable');
            }, 10);

            this.renderPagination($currentEl, this);

            $currentEl.append('<div id="timeRecivingDataFromServer">Created in ' + (new Date() - this.startTime) + ' ms</div>');
        },

        cancelChanges: function () {
            var self = this;
            var edited = this.edited;
            var collection = this.collection;
            var copiedCreated;
            var dataId;

            async.each(edited, function (el, cb) {
                var tr = $(el).closest('tr');
                var trId = tr.attr('id');
                var rowNumber = tr.find('[data-content="number"]').text();
                var id = tr.data('id');
                var template = _.template(cancelEdit);
                var model;

                if (!id || (id.length < 24)) {
                    self.hideSaveCancelBtns();
                    return cb('Empty id');
                }

                model = collection.get(id);
                model = model.toJSON();
                model.index = rowNumber;
                if (!trId) {
                    tr.replaceWith(template({holiday: model}));
                } else {
                    tr.remove();
                }
                cb();
            }, function (err) {
                if (!err) {
                    self.hideSaveCancelBtns();
                    if (!err) {
                        self.editCollection = new EditCollection(collection.toJSON());
                        self.editCollection.on('saved', self.savedNewModel, self);
                        self.editCollection.on('updated', self.updatedOptions, self);
                    }
                }
            });

            copiedCreated = this.$el.find('#false');
            dataId = copiedCreated.attr('data-id');
            this.editCollection.remove(dataId);
            delete this.changedModels[dataId];
            copiedCreated.remove();

            this.createdCopied = false;

            self.changedModels = {};
        }

    });

    return HolidayListView;
});
