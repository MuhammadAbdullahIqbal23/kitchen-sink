import pandas as pd
import streamlit as st

st.title("Water quality")
site = st.selectbox("Site", ["North ridge", "River bend"])
threshold = st.slider("Alert threshold", 0, 100, 40)
if st.button("Refresh"):
    st.toast("Refreshed")
st.metric("Turbidity", "32 NTU", "-4")
st.dataframe(pd.DataFrame({"site": [site], "threshold": [threshold]}))
st.warning("Sensor 4 is offline")
