define([
    'Backbone',
    'jQuery',
    'Underscore',
    'views/dialogViewBase',
    'text!templates/Invoices/CreateTemplate.html',
    'models/InvoiceModel',
    'populate',
    'views/Invoices/InvoiceProductItems',
    'views/Assignees/AssigneesView',
    'views/Payment/list/ListHeaderInvoice',
    'constants'
], function (Backbone, $, _, ParentView, CreateTemplate, InvoiceModel, populate, InvoiceItemView, AssigneesView, ListHederInvoice, CONSTANTS) {
    'use strict';

    var CreateView = ParentView.extend({
        el         : '#content-holder',
        contentType: 'Invoices',
        template   : _.template(CreateTemplate),

        initialize: function () {
            _.bindAll(this, 'saveItem', 'render');
            this.model = new InvoiceModel();
            this.responseObj = {};
            this.render();
        },

        events: {
            'click .details': 'showDetailsBox'
        },

        chooseOption: function (e) {
            var holder = $(e.target).parents('dd').find('.current-selected');
            holder.text($(e.target).text()).attr('data-id', $(e.target).attr('id'));
        },

        showDetailsBox: function (e) {
            $(e.target).parent().find('.details-box').toggle();
        },

        saveItem: function () {
            var self = this;
            var mid = 56;
            var $currentEl = this.$el;

            var selectedProducts = $currentEl.find('.productItem');
            var products = [];
            var selectedLength = selectedProducts.length;
            var targetEl;
            var productId;
            var quantity;
            var price;
            var taxes;
            var amount;
            var description;

            var forSales = this.forSales || false;

            var supplier = $currentEl.find('#supplier').data('id');
            var salesPersonId = $currentEl.find('#salesPerson').data('id') ? this.$('#salesPerson').data('id') : null;
            var paymentTermId = $currentEl.find('#payment_terms').data('id') ? this.$('#payment_terms').data('id') : null;
            var invoiceDate = $currentEl.find('#invoice_date').val();
            var dueDate = $currentEl.find('#due_date').val();
            var i;
            var total = parseFloat($currentEl.find('#totalAmount').text());
            var unTaxed = parseFloat($currentEl.find('#totalUntaxes').text());
            var balance = parseFloat($currentEl.find('#balance').text());

            var payments = {
                total  : total,
                unTaxed: unTaxed,
                balance: balance
            };

            var currency = {
                _id : $currentEl.find('#currencyDd').attr('data-id'),
                name: $.trim($currentEl.find('#currencyDd').text())
            };

            var usersId = [];
            var groupsId = [];
            var whoCanRW;
            var data;
            var model;

            if (selectedLength) {
                for (i = selectedLength - 1; i >= 0; i--) {
                    targetEl = $(selectedProducts[i]);
                    productId = targetEl.data('id');
                    if (productId) {
                        quantity = targetEl.find('[data-name="quantity"]').text();
                        price = targetEl.find('[data-name="price"]').text();
                        description = targetEl.find('[data-name="productDescr"]').text();
                        taxes = targetEl.find('.taxes').text();
                        amount = targetEl.find('.amount').text();

                        products.push({
                            product    : productId,
                            description: description,
                            unitPrice  : price,
                            quantity   : quantity,
                            taxes      : taxes,
                            subTotal   : amount
                        });
                    }
                }
            }

            $('.groupsAndUser tr').each(function () {
                if ($(this).data('type') === 'targetUsers') {
                    usersId.push($(this).data('id'));
                }
                if ($(this).data('type') === 'targetGroups') {
                    groupsId.push($(this).data('id'));
                }

            });

            whoCanRW = this.$el.find("[name='whoCanRW']:checked").val();
            data = {
                forSales: forSales,

                supplier             : supplier,
                fiscalPosition       : null,
                sourceDocument       : null, // $.trim($('#source_document').val()),
                supplierInvoiceNumber: $.trim($('#supplier_invoice_num').val()),
                paymentReference     : $.trim($('#payment_reference').val()),
                invoiceDate          : invoiceDate,
                dueDate              : dueDate,
                account              : null,
                journal              : null,

                salesPerson : salesPersonId,
                paymentTerms: paymentTermId,

                products   : products,
                paymentInfo: payments,
                currency   : currency,

                groups: {
                    owner: this.$el.find('#allUsersSelect').attr('data-id') || null,
                    users: usersId,
                    group: groupsId
                },

                whoCanRW: whoCanRW,
                workflow: this.defaultWorkflow

            };

            if (supplier) {
                model = new InvoiceModel();
                model.save(data, {
                    headers: {
                        mid: mid
                    },
                    wait   : true,
                    success: function () {
                        var redirectUrl = self.forSales ? 'easyErp/salesInvoices' : 'easyErp/Invoices';

                        self.hideDialog();
                        Backbone.history.navigate(redirectUrl, {trigger: true});
                    },

                    error: function (model, xhr) {
                        self.errorNotification(xhr);
                    }
                });

            } else {
                App.render({
                    type   : 'error',
                    message: CONSTANTS.RESPONSES.CREATE_QUOTATION
                });
            }

        },

        render: function () {
            var formString = this.template();
            var self = this;
            var invoiceItemContainer;
            var paymentContainer;

            this.$el = $(formString).dialog({
                closeOnEscape: false,
                autoOpen     : true,
                resizable    : true,
                dialogClass  : 'edit-dialog',
                title        : 'Create Invoice',
                width        : '900px',
                position     : {within: $('#wrapper')},
                buttons      : [
                    {
                        id   : 'create-invoice-dialog',
                        text : 'Create',
                        click: function () {
                            self.saveItem();
                        }
                    },

                    {
                        text : 'Cancel',
                        click: function () {
                            self.hideDialog();
                        }
                    }]

            });

            this.renderAssignees(this.model);

            invoiceItemContainer = this.$el.find('#invoiceItemsHolder');
            invoiceItemContainer.append(
                new InvoiceItemView({balanceVisible: true, canBeSold: this.forSales}).render().el
            );

            paymentContainer = this.$el.find('#payments-container');
            paymentContainer.append(
                new ListHederInvoice().render().el
            );

            populate.get('#currencyDd', CONSTANTS.URLS.CURRENCY_FORDD, {}, 'name', this, true);

            populate.get2name('#supplier', CONSTANTS.URLS.SUPPLIER, {}, this, false, true);
            populate.get('#payment_terms', '/paymentTerm', {}, 'name', this, true, true);
            populate.get2name('#salesPerson', CONSTANTS.URLS.EMPLOYEES_RELATEDUSER, {}, this, true, true);
            populate.fetchWorkflow({wId: 'Purchase Invoice'}, function (response) {
                if (!response.error) {
                    self.defaultWorkflow = response._id;
                }
            });

            this.$el.find('#invoice_date').datepicker({
                dateFormat : 'd M, yy',
                changeMonth: true,
                changeYear : true
            }).datepicker('setDate', new Date());

            this.$el.find('#due_date').datepicker({
                dateFormat : 'd M, yy',
                changeMonth: true,
                changeYear : true
            });

            this.delegateEvents(this.events);

            return this;
        }

    });

    return CreateView;
});
