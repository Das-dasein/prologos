"""Official Draft 2020-12 validation; stdin is synthetic data only."""
import json, sys
import jsonschema
request = json.load(sys.stdin)
schema = request['schema']
jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
errors = [f'{n}:{list(e.path)}:{e.message}' for n, row in enumerate(request['records']) for e in v.iter_errors(row)]
print(json.dumps({'valid': not errors, 'errors': errors, 'validator': 'jsonschema', 'version': __import__('importlib.metadata', fromlist=['version']).version('jsonschema')}))
sys.exit(1 if errors else 0)
