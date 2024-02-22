import {h} from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'
import {EnhanceAppContext} from "vitepress";

export default {
	extends:DefaultTheme,
	Layout:()=>h(DefaultTheme.Layout,null,{

	}),
	enhanceApp({app}:EnhanceAppContext){
	}
}
