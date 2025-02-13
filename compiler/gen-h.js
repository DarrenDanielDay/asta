const whitespaceRE = /^\s+$/;

const textSpecialRE = /(^|[^\\])("|\n)/g;

function generateName(nameTree) {
    const name = generate(nameTree);
    return `h('${name}',`
}

function generate(tree) {

    const type = tree.type;

    if (typeof tree === "string") {
        return tree;
    } else if (Array.isArray(tree)) {
        let output = "";

        for (let i = 0; i < tree.length; i++) {
            output += generate(tree[i]);
        }

        return output;
    } else if (type === "comment") {
        return `/*${generate(tree.value[1])}*/`;
    } else if (type === "attributes") {
        const value = tree.value;
        let output = "";
        let separator = "";

        for (let i = 0; i < value.length; i++) {
            const pair = value[i];
            output += `${separator}"${generate(pair[0])}":${generate(pair[2])}${generate(pair[3])}`;
            separator = ",";
        }

        return {
            output,
            separator
        };
    } else if (type === "text") {
        const textGenerated = generate(tree.value);
        const textGeneratedIsWhitespace = whitespaceRE.test(textGenerated) && textGenerated.indexOf("\n") !== -1;

        // Text that is only whitespace with at least one newline is ignored and
        // added only to preserve newlines in the generated code.
        return {
            output: textGeneratedIsWhitespace ?
                textGenerated :
                `"${textGenerated.replace(textSpecialRE, (match, character, characterSpecial) =>
                    character + (characterSpecial === "\"" ? "\\\"" : "\\n\\\n")
                )
                }"`,
            isWhitespace: textGeneratedIsWhitespace
        };
    } else if (type === "interpolation") {
        return `${generate(tree.value[1])}`;
    } else if (type === "node") {
        // Nodes represent a variable reference.
        const value = tree.value;
        return generate(value[1]) + generateName(value[2]) + generate(value[3]);
    } else if (type === "nodeData") {
        // Data nodes represent calling a function with either a custom data
        // expression or an object using attribute syntax.
        const value = tree.value;
        const data = value[4];
        const dataGenerated = generate(data);

        return `${generate(value[1])}${generateName(value[2])}${generate(value[3])}(${data.type === "attributes" ? `{${dataGenerated.output}}` : dataGenerated
            })`;
    } else if (type === "nodeDataChildren") {
        // Data and children nodes represent calling a function with a data
        // object using attribute syntax and children.
        const value = tree.value;
        const data = generate(value[4]);
        const children = value[6];
        const childrenLength = children.length;
        let childrenGenerated;

        if (childrenLength === 0) {
            childrenGenerated = "";
        } else {
            let separator = "";
            childrenGenerated = data.separator + "children:[";

            for (let i = 0; i < childrenLength; i++) {
                const child = children[i];
                const childGenerated = generate(child);

                if (child.type === "text") {
                    if (childGenerated.isWhitespace) {
                        childrenGenerated += childGenerated.output;
                    } else {
                        childrenGenerated += separator + childGenerated.output;
                        separator = ",";
                    }
                } else {
                    childrenGenerated += separator + childGenerated;
                    separator = ",";
                }
            }

            childrenGenerated += "]";
        }
        console.log(value[1], value[2], value[3])

        return `${generate(value[1])}${generateName(value[2])}${generate(value[3])}{${data.output}${childrenGenerated}})`;
    }
}

module.exports = { generate }