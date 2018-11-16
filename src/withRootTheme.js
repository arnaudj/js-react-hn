import React from "react";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import blue from "@material-ui/core/colors/blue";
import green from "@material-ui/core/colors/green";
import CssBaseline from "@material-ui/core/CssBaseline";

// https://material-ui.com/style/color/
const theme = createMuiTheme({
  palette: {
    primary: blue,
    secondary: green,
    type: "light" // light/dark, https://material-ui.com/style/color/#color-tool
  },
  typography: {
    useNextVariants: true
  }
});

function withRootTheme(Component) {
  function withRootTheme(props) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...props} />
      </MuiThemeProvider>
    );
  }

  return withRootTheme;
}

export default withRootTheme;
