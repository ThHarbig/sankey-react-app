/**
 * Created by theresa on 30.01.18.
 */
import React from "react";
import ReactDOM from "react-dom";
import Menu from "./lib/Menu.jsx";
import SankeyDiagram from "./lib/SankeyDiagram.jsx";
import { observer } from 'mobx-react';
import { extendObservable,extras } from "mobx";
import sankeyData from "./data/sankeyData.json";


class DataChange {
    constructor() {
        extendObservable(this, {
            data: sankeyData[0],
        });
    }

    changeData(data) {
        this.data = data;
    }
}
const dataChange = new DataChange();
const Plot = observer(class Plot extends React.Component {
        render() {
            return (
                <div>
                    <h3>Sankey diagram</h3>
                    <div className="bottom-right-svg">
                        <Menu dataChange={this.props.curr} options={sankeyData}/>
                        <SankeyDiagram id="sankeyDiagram" data={this.props.curr.data}/>
                    </div>
                </div>
            )
        }
    }
);

ReactDOM.render(<Plot curr={dataChange}/>, document.getElementById("top-line-chart"));
