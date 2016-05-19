var argv = require('yargs').argv;
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var deref = require('json-schema-deref');
var mkdirp = require('mkdirp');

var swaggerPath = path.resolve(path.join(argv.file));
var defaultValues = {}
if(argv.defaultValues){
  defaults = argv.defaultValues.split(',');
  _.each(defaults, item => {
    pair = item.split(':');
    defaultValues[pair[0]] = pair[1];
  })
}


fs.readFile(swaggerPath, (err, data) => {
  if (err) throw err;
  var schema = JSON.parse(data)
  deref(schema, (err, swagger) => {
    if (err) throw err;

    output = _.map(swagger.paths, path => {
      return _.map(path, verb => {
        return {
          operationId: verb.operationId,
          parameters: _.fromPairs(verb.parameters.map(p => {
            parameterValue = p.type;
            if(defaultValues[p.name]){
              parameterValue = defaultValues[p.name];
            }
            return [p.name, parameterValue];
          })),
          assertions: [_.keys(verb.responses).map(key => { return `response.status == ${key}` }).join(' || ')],
          outputMapping: {'response.body.id': 'id', 'response.body.name': 'name'},
          inputMapping: {'name': 'request.path.name', 'id': 'request.header.x-ms-somekey'}
        };
      })
    })

    recipePath = path.join('./test/recipes', path.relative('.', argv.file));
    mkdirp(path.dirname(recipePath), function (err) {
      if (err) console.error(err);

      fs.writeFile(recipePath, JSON.stringify(_.flattenDeep(output), null, 2), err => {
        if (err) throw err;

        console.log(`Created test recipe in ${recipePath}.`);
      })
    });
  });
});
