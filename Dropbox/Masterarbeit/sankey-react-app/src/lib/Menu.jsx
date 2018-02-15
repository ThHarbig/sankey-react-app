import React from "react";
import {observer} from "mobx-react";


const Menu = observer(class Menu extends React.Component {
    constructor() {
        super();
        this.handleClick = this.handleClick.bind(this);
        Menu.getOptions = Menu.getOptions.bind(this);
    }


    handleClick(event) {
        for(let key in this.props.dataChange.sankeyCounts){
            if(key===event.target.value){
                this.props.dataChange.setSankeyData(this.props.dataChange.sankeyCounts[key])
                break;
            }
        }
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
                    {Menu.getOptions(this.props.dataChange.sankeyCategories)}
                </select>
            </div>
        );
    }
});
export default Menu;
