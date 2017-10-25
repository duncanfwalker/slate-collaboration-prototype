import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { State, Change, Block } from 'slate';

it('adds nodes', () => {
    const initialNode = {  kind: 'block', type: 'text', data: { name: 'initial'} };
    const initialStateJS = {
        document: {
            nodes: [
                initialNode,
            ]
        }
    };
    const state = State.fromJSON(initialStateJS);

    const key = state.document.key;

    const change = state.change()
        .insertNodeByKey(key, 0, Block.create({ type: 'text', data: { name: 'added' }}));

    expect(change.state.toJS().document.nodes).toEqual([initialNode, { data: 'added' }])

});
