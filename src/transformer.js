import { toSlateOperations, toShareDBOperations } from './toSlateOperations';

const transformer = doc => (change, operationDone) => {
    doc.subscribe(function (err) {
        if(err) console.error(err);

        doc.on('op', (ops, source) => operationDone({
                    operations: ops.map(toSlateOperations),
                    source
                })
        );

        const zeroJsonOps = change.operations.map(operation => toShareDBOperations({ operation }));

        doc.submitOp(zeroJsonOps, { source: true }, console.error);

        doc.flush()
    })

};

export default transformer;
