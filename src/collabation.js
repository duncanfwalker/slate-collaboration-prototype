import { Editor } from 'slate-react';
import { State, Block } from 'slate';

import React from 'react';
import initialState from './state.json';
import { isKeyHotkey } from 'is-hotkey';

import connect from './client';

/**
 * Hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey('mod+b')
const isItalicHotkey = isKeyHotkey('mod+i')
const isUnderlinedHotkey = isKeyHotkey('mod+u')
const isCodeHotkey = isKeyHotkey('mod+`')

/**
 * Define a schema.
 *
 * @type {Object}
 */

const schema = {
    marks: {
        bold: {
            fontWeight: 'bold'
        },
        code: {
            fontFamily: 'monospace',
            backgroundColor: '#eee',
            padding: '3px',
            borderRadius: '4px'
        },
        italic: {
            fontStyle: 'italic'
        },
        underlined: {
            textDecoration: 'underline'
        }
    }
}



/**
 * A simple editor component to demo syncing with.
 *
 * @type {Component}
 */

class SyncingEditor extends React.Component {

    /**
     * Deserialize the initial editor state.
     *
     * @type {Object}
     */

    state = {
        state: State.fromJSON(initialState),
    }

    /**
     * When new `operations` are received from one of the other editors that is in
     * sync with this one, apply them in a new change.
     *
     * @param {Array} operations
     */

    applyOperations = (operations) => {
        const { state } = this.state
        const change = state.change().applyOperations(operations)
        this.onChange(change, { remote: true })
    }

    /**
     * Check if the current selection has a mark with `type` in it.
     *
     * @param {String} type
     * @return {Boolean}
     */

    hasMark = (type) => {
        const { state } = this.state
        return state.activeMarks.some(mark => mark.type == type)
    }

    /**
     * On change, save the new `state`. And if it's a local change, call the
     * passed-in `onChange` handler.
     *
     * @param {Change} change
     * @param {Object} options
     */

    onChange = (change, options = {}) => {
        this.setState({ state: change.state })

        if (!options.remote) {
            setTimeout(() => {
                this.props.onChange(change)
            }, options.delay);

        }
    }

    /**
     * On key down, if it's a formatting command toggle a mark.
     *
     * @param {Event} event
     * @param {Change} change
     * @return {Change}
     */

    onKeyDown = (event, change) => {
        let mark

        if (isBoldHotkey(event)) {
            mark = 'bold'
        } else if (isItalicHotkey(event)) {
            mark = 'italic'
        } else if (isUnderlinedHotkey(event)) {
            mark = 'underlined'
        } else if (isCodeHotkey(event)) {
            mark = 'code'
        } else {
            return
        }

        event.preventDefault()
        change.toggleMark(mark)
        return true
    }

    /**
     * When a mark button is clicked, toggle the current mark.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickMark = (event, type) => {
        event.preventDefault()
        const { state } = this.state
        const change = state.change().toggleMark(type)
        this.onChange(change)
    }

    /**
     * Render.
     *
     * @return {Element}
     */

    render() {
        return (
            <div>
                {this.renderToolbar()}
                {this.renderEditor()}
            </div>
        )
    }


    addBlock(state, text = 'A') {
        const { state: slateState } = state
        const blockInfo = {
            data: {},
            isVoid: false,
            type: 'paragraph',
            "nodes": [
                {
                    "kind": "text",
                    "ranges": [
                        {
                            "text": text
                        }
                    ]
                }
            ]
        };
        const newState = slateState.change()
            .insertNodeByKey(slateState.document.key, slateState.document.nodes.size,  Block.create(blockInfo))


        this.onChange(newState);

    }

    /**
     * Render the toolbar.
     *
     * @return {Element}
     */

    renderToolbar = () => {
        return (
            <div className="menu toolbar-menu">
                {this.renderButton('bold', 'format_bold')}
                {this.renderButton('italic', 'format_italic')}
                {this.renderButton('underlined', 'format_underlined')}
                {this.renderButton('code', 'code')}
                <button name='paragraph' active={true} onClick={() => this.addBlock(this.state, 'B')}>
                    Add paragraph B
                </button>
                <button name='paragraph' active={true} onClick={() => this.addBlock(this.state, 'C')}>
                    Add paragraph C
                </button>
            </div>
        )
    }

    /**
     * Render a mark-toggling toolbar button.
     *
     * @param {String} type
     * @param {String} icon
     * @return {Element}
     */

    renderButton = (type, icon) => {
        const isActive = this.hasMark(type)
        const onMouseDown = event => this.onClickMark(event, type)

        return (
            <span className="button" onMouseDown={onMouseDown} data-active={isActive}>
        <span className="material-icons">{icon}</span>
        </span>
        )
    }

    /**
     * Render the editor.
     *
     * @return {Element}
     */

    renderEditor = () => {
        return (
            <div className="editor">
                <Editor
                    state={this.state.state}
                    onChange={this.onChange}
                    onKeyDown={this.onKeyDown}
                    schema={schema}
                    placeholder="Enter some text..."
                    spellCheck
                />
            </div>
        )
    }

}

/**
 * The syncing operations example.
 *
 * @type {Component}
 */

class SyncingOperationsExample extends React.Component {
    constructor(props) {
        super(props);

        this.conn1 = connect((change) => {
            if(this.one && !change.source  ) {
                this.one.applyOperations(change.operations)
            }
        });
    }
    /**
     * Save a reference to editor `one`.
     *
     * @param {SyncingEditor} one
     */

    oneRef = (one) => {
        this.one = one
    }

    /**
     * Render both editors.
     *
     * @return {Element}
     */

    render() {
        return (
            <div>
                <SyncingEditor
                    ref={this.oneRef}
                    onChange={this.conn1.submit('User 1')}

                />
            </div>
        )
    }

}

/**
 * Export.
 */

export default SyncingOperationsExample