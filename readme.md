Ponto
=====

Ponto é uma aplicação simples para contabilizar as horas trabalhadas.
Este projeto foi concebido para atender minhas necessidades pessoais,
além de ter como segundo objetivo, brincar com elementos dinâmicamente
gerados pelo jQuery + jQuery UI.

A base do projeto é HTML5, Session Storage, Javascript, Google Charts API,
SQLite3 e PHP 5.3. Com isso, deu de brincar bastante.


Características
---------------

- média de horas cumpridas por dia
- gráfico de horas trabalhadas por dia
- gráfico de horas cumpridas por mês
- sub-usuários
- logar-se como um sub-usuário sem a necessidade de saber a senha
- navegação por mês, podendo selecionar um dia limite para o mês


Requerimentos
-------------

- PHP 5.3.x com módulos: Mcrypt, Filter, SQLite3
- SQLite3
- Conexão a internet (para gerar os gráficos)
- Navegador compatível com HTML5

Instalação
----------

Com todos os requisitos obedecidos, somente é necessário dar permissão
de gravação ao sub-diretório php da aplicação, que é onde será gravado
o banco de dados.
É importante que o acesso via web a esta pasta seja proibido por questões
de segurança, para isso, foi criado um arquivo .htaccess dentro do mesmo.
Será necessário fazer essa navegação via outros meios caso você não use o
Servidor Apache ou não possua o módulo Rewrite habilitado.


Sobre o Autor
-------------
Thiago Paes é evangelizador de PHP e possui um site pessoal onde descreve
alguns projetos pessoais http://thiagopaes.com.br. Viciado em Software
Livre e Capoeira.
