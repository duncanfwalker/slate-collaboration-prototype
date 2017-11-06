const transformer = doc => (change, operationDone) => {
    let count = 0;
    doc.subscribe(function (err) {

        doc.on('op', (ops, source) => {

            console.log(ops)

            const operations = ops.map(toSlateOperations);

            let name;
            let path;
            if(operations[0].node.data) {
                count++;
                name = operations[0].node.data.name;
                path = operations[0].path[0];

            }

            console.log('Count',count)
            console.log('Path',name,path)
            return operationDone({
                operations
            })
        });

        const zeroJsonOps = change.operations.map(operation => toZeroJSON({ operation }));

        /* We need to fake the version number since it is used to assign op version number here:
         https://github.com/share/sharedb/blob/b33bdd59ce4f2c55604801d779554add94a12616/lib/client/connection.js#L393
         */


        // console.log('submitting', zeroJsonOps["0"].li.get('data').get('name'));
        doc.submitOp(zeroJsonOps, { source: true }, (err) => {
            console.error(err)
        });

        // doc.version = previousVersion;
        doc.flush()
    })

};

function toZeroJSON({ operation }) {
    const [path, ...rest] = operation.path; // TODO: work out why this only seems to work with first element in path
    return {
        p: ['document', 'nodes', path],
        [map[operation.type]]: operation.node,

    }
}

export default transformer;
