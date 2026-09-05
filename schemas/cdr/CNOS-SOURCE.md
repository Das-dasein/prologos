# CNOS CDR schema source

The files in `schemas/cdr/` and their generic dependency in `schemas/cdd/`
are vendored from the CNOS repository at commit
`22341a9b2d3dc833611bb290777d02f49f112646`.

The canonical CUE definition is `schemas/cdr/receipt.cue`, which imports the
generic kernel through `cue.mod/module.cue`. Keep this snapshot pinned when a
receipt is reviewed; update it only as a separately reviewed CNOS schema
change.
