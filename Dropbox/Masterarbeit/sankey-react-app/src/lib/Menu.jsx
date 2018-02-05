import React from "react";
import {observer} from "mobx-react";


const Menu = observer(class Menu extends React.Component {
    constructor() {
        super();
        this.state = {
            modalIsOpen: false
        };

        this.handleClick = this.handleClick.bind(this);
        this.getRadioButtons = this.getRadioButtons.bind(this);
    }


    handleClick(category) {
        const that = this;
        this.props.options.forEach(function (d) {
            if (d.category === category) {
                that.props.dataChange.changeData(d);
            }
        });
        this.setState({modalIsOpen: false});
    }

    getRadioButtons(data) {
        const that = this;
        return data.map(function (d, i) {
            return (
                <div key={d.category} className="menu">
                    <label> {d.category} <input type="radio" style={{horizontalAlign: "middle"}} id="mc"
                                                name="property" value={d.category}
                                                onClick={() => that.handleClick(d.category)}/></label>
                </div>
            )
        });
    }

    render() {
        return (
            <div>
                <form>
                    <p>Choose property</p>
                    <fieldset>
                        {this.getRadioButtons(this.props.options)}
                    </fieldset>
                </form>
            </div>
        );
    }
});
export default Menu;
