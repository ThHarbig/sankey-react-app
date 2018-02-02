import React from 'react';
import { observer } from 'mobx-react';


const ToolTip=observer(class ToolTip extends React.Component {
    render() {
        const width = 150;
        let transform = "translate(0,0)";
        let style = {};
        let text = "";
        if (this.props.tooltip.display) {
            text = this.props.tooltip.data.source + " -> " + this.props.tooltip.data.target + ": \n" + this.props.tooltip.data.value;
            transform = "translate(" + this.props.tooltip.pos.x + "," + this.props.tooltip.pos.y + ")";
            style = {
                left: this.props.tooltip.pos.x,
                top: this.props.tooltip.pos.y-350,

            };
        }
        else{
            style["display"]= "none";
        }
        return (
            <div className="tooltip" style={style} >
                {text}
            </div>
        );
    }
});
export default ToolTip;