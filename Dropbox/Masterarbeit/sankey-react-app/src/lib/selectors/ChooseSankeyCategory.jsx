import React from "react";
import {observer} from "mobx-react";


const Menu = observer(class Menu extends React.Component {
    constructor() {
        super();
        this.handleClick = this.handleClick.bind(this);
        Menu.getOptions = Menu.getOptions.bind(this);
    }


    handleClick(event) {
        this.props.parser.setCurrentSankeyData(event.target.value);
    }

    static getOptions(data) {
        return data.map(function (d, i) {
            return (
                <option key={d} value={d} >{d}</option>
            )
        });
    }


    render() {
        return (
            <div>
                <select onChange={this.handleClick}>
                    {Menu.getOptions(this.props.parser.clinicalCat)}
                </select>
            </div>
        );
    }
});
export default Menu;
