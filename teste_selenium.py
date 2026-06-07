from selenium import webdriver
import time

driver = webdriver.Chrome()

def testar_fluxo():
    driver.get("http://127.0.0.1:5000")
    print("Testando cadastro...")
    # (Adicione aqui os comandos para encontrar o input e enviar o form)
    
testar_fluxo()