var express = require('express');
var router = express.Router();
var InvoiceHandler = require('../handlers/invoice');
var multipartMiddleware = require('connect-multiparty')();

module.exports = function (models, event) {
    var handler = new InvoiceHandler(models, event);

    router.get('/', handler.getAll);
    router.get('/totalCollectionLength', handler.totalCollectionLength);
    router.get('/getFilterValues', handler.getFilterValues);
    router.get('/generateName', handler.generateName);
    router.get('/stats', handler.getStats);
    router.get('/stats/project', handler.getStatsForProject);
    router.get('/chart', handler.chartForProject);
    router.get('/:viewType', function (req, res, next) {
        var viewType = req.params.viewType;
        switch (viewType) {
            case "form":
                handler.getInvoiceById(req, res, next);
                break;
            default:
                handler.getForView(req, res, next);
        }
    });

    router.delete('/:_id', function (req, res) {
        var id = req.param('_id');

        handler.removeInvoice(req, res, id);
    });

    router.patch('/approve', handler.approve);

    router.patch('/:id', handler.updateOnlySelected);

    router.put('/:_id', function (req, res) {
        var data = {};
        var id = req.params._id;

        data.invoice = req.body;

        handler.updateInvoice(req, res, id, data);
    });

    router.post('/', handler.create);
    router.post('/receive', handler.receive);
    router.post('/attach', multipartMiddleware, handler.attach);


    return router;
};