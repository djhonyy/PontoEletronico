/**
 * Ponto
 *
 * Sistema de ponto
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @author     Thiago Paes - mrprompt@gmail.com
 * @package    Ponto
 * @subpackage Ponto
 * @filesource Ponto.js
 * @copyright  Copyright 2011, Thiago Paes
 * @link       http://github.com/mrprompt/Ponto/
 * @version    $Revision: 0.1 $
 * @license    http://www.opensource.org/licenses/mit-license.php The MIT License
 */
Ponto = {
    /**
     * Cria o ambiente
     */
    init: function() {
        $('body').empty();
        
        $('<section/>').attr('id', 'Ponto').appendTo($('body'));

        if (sessionStorage.getItem('id') !== null) {
            $('<header/>')
            .append($('<nav/>')
                .append($('<ul/>')
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Bater Ponto')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Ponto.ponto();
                            })))
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Preferências')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Ponto.preferencias();
                            })))
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Usuários')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Ponto.usuarios();
                            })))
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Sair')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Ponto.logout();
                            }))))
                .append($('<b/>')
                    .html(sessionStorage.getItem('nome')))
                )
            .insertBefore($('#Ponto'));

            // escondo o botão de ponto caso hoje não seja um dia de trabalho
            // setado nas configurações do usuário
            var arrDiasTrabalho = sessionStorage.getItem('dias_trabalho').split(',');
            var objData = new Date();

            if ($.inArray(objData.getDay().toString(), arrDiasTrabalho) < 0) {
                $('header nav ul li:eq(0)').hide();
            }

            Ponto.relatorio();
        } else {
            Ponto._instala();

            Ponto.login();
        }
    },

    /**
     * Recupero o conexão com o banco
     */
    _getConnection: function() {
        try {
            if (window.openDatabase) {
                var db = openDatabase("Ponto2", "0.2", "Ponto Eletrônico", 200000);

                if (!db) {
                    alert("Erro criando banco de dados, por favor, teste um navegador compatível.");

                    return false;
                }

                return db;
            } else {
                throw "Não foi possível utilizar a base de dados, navegador incompatível.";
            }
        } catch(err) {
            console.log(err);
        }
    },

    /**
     * Passo inicial, crio as tabelas para uso do sistema e um usuário 
     * temporário para que seja possível adicionar novos usuários
     **/
    _instala: function() {
        try {
            // crio as bases
            Ponto._getConnection().transaction(function(tx) {
                var sql = "CREATE TABLE IF NOT EXISTS usuarios ("
                                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                + "owner INTEGER NULL DEFAULT 1, "
                                + "login CHAR(32) NOT NULL UNIQUE, "
                                + "password CHAR(120) NOT NULL); ";

                tx.executeSql(sql);
            });
            Ponto._getConnection().transaction(function(tx) {
                var sql = "CREATE TABLE IF NOT EXISTS preferencias ("
                                + "usuario_id INTEGER NOT NULL UNIQUE, "
                                + "horas_dia INTEGER DEFAULT (4), "
                                + "horas_almoco INTEGER DEFAULT (1), "
                                + "nome TEXT NOT NULL,  email TEXT, "
                                + "dias_trabalho TEXT);";;

                tx.executeSql(sql);
            });
            Ponto._getConnection().transaction(function(tx) {
                var sql = "CREATE TABLE IF NOT EXISTS ponto ("
                                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                + "usuario_id INTEGER NOT NULL, "
                                + "entrada DATETIME NOT NULL, "
                                + "saida DATETIME, "
                                + "obs TEXT);";

                tx.executeSql(sql);
            });

            // crio a trigger necessária para manter a base sempre limpa
            Ponto._getConnection().transaction(function(tx) {
                var sql = "CREATE TRIGGER delete_usuarios DELETE ON usuarios "
                        + "BEGIN "
                        + "     DELETE FROM preferencias WHERE usuario_id = old.id;"
                        + "     DELETE FROM ponto WHERE usuario_id = old.id;"
                        + "END;";

                tx.executeSql(sql);
            });
            
            // mando criar um usuário
            Ponto._getConnection().transaction(function(tx) {
                var sql = "SELECT COUNT(id) AS total FROM usuarios";

                tx.executeSql(sql, [],
                function(tx, result) {
                    if (result.rows.item(0).total == 0) {
                        var usuario = new Object;
                            usuario.id      = 1;
                            usuario.email   = 'admin@localhost';
                            usuario.login   = 'admin';
                            usuario.nome    = 'Administrador';
                            usuario.owner   = 1;
                            usuario.horas_almoco    = 1;
                            usuario.horas_dia       = 8;
                            usuario.dias_trabalho   = '1,2,3,4,5';
                            
                        Ponto._criaSessao(usuario);
                        Ponto.init();
                    }
                },
                function(tx, error) {
                    console.log(error);
                });
            });
        } catch(err) {
            console.log(err);
        }
    },

    /**
     * Cria a tabela com o resultado das horas trabalhadas
     */
    _criaRelatorio: function(strData) {
        $('.widget-relatorio').remove();
        $('.graph').remove();

        Ponto._getConnection().transaction(function(tx) {
            var dataRequest = strData.split('-');
            var ano = dataRequest[0];
            var mes = (dataRequest[1].length == 1 ? '0' + dataRequest[1] : dataRequest[1]);
            var dia = (dataRequest[2].length == 1 ? '0' + dataRequest[2] : dataRequest[2]);
            var ini = ano + '-' + mes + '-' + '01 00:00:00';
            var fim = ano + '-' + mes + '-' + dia + ' 23:59:59';
            var sql = "SELECT id, entrada, saida, obs "
                    + "FROM ponto "
                    + "WHERE entrada BETWEEN ? AND ? "
                    + "AND usuario_id = ? "
                    + "ORDER BY entrada DESC "
                    + "LIMIT 31";
            var date1 = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
            var date2 = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
            
            tx.executeSql(sql, [ini, fim, sessionStorage.getItem('id')],
            function(tx, result) {
                var results = result.rows.length;

                $('<div/>').attr('class', 'widget-relatorio')
                           .addClass('ui-widget ui-widget-content ui-helper-clearfix ui-corner-all')
                           .append($('<table/>').attr('id', 'tbRelatorio'))
                           .appendTo($('#Ponto'));

                    $('<thead/>')
                    .append($('<tr/>')
                        .append($('<th/>')
                            .addClass('data')
                            .html('Data'))
                        .append($('<th/>')
                            .addClass('entrada')
                            .html('Entrada'))
                        .append($('<th/>')
                            .addClass('saida')
                            .html('Saída'))
                        .append($('<th/>')
                            .addClass('horas')
                            .html('Horas')))
                    .addClass('ui-widget-header ui-helper-clearfix ui-corner-all')
                    .appendTo($('#tbRelatorio'));

                    $('<tbody/>').appendTo($('#tbRelatorio'));

                if (results > 0) {
                    for (var i = 0; i < results; i++) {
                        var $linha  = $('<tr/>').appendTo($('#tbRelatorio tbody'));
                        var data    = result.rows.item(i).entrada.substr(8, 2)
                                    + '/'
                                    + result.rows.item(i).entrada.substr(5, 2);

                        // calculo as horas trabalhadas
                        date1.setHours(parseInt(result.rows.item(i).entrada.substr(11, 2), 10), 
                                       parseInt(result.rows.item(i).entrada.substr(14, 2), 10), 
                                       parseInt(result.rows.item(i).entrada.substr(17, 2), 10));
                        
                        if (result.rows.item(i).saida !== null) {
                            date2.setHours(parseInt(result.rows.item(i).saida.substr(11, 2), 10), 
                                           parseInt(result.rows.item(i).saida.substr(14, 2), 10), 
                                           parseInt(result.rows.item(i).saida.substr(17, 2), 10));
                        } else {
                            date2.setHours(parseInt(result.rows.item(i).entrada.substr(11, 2), 10), 
                                           parseInt(result.rows.item(i).entrada.substr(14, 2), 10), 
                                           parseInt(result.rows.item(i).entrada.substr(17, 2), 10));                            
                        }
                        

                        var time    = date2.getTime() - date1.getTime();
                        var horas   = parseInt((time / 3600000), 10);
                        var minutos = parseInt(((time % 3600000) / 60000), 10);

                        $linha.append($('<td/>').addClass('data').html(data))
                              .append($('<td/>').addClass('entrada').html(result.rows.item(i).entrada.substr(11, 5)))
                              .append($('<td/>').addClass('saida').html((result.rows.item(i).saida !== null ? result.rows.item(i).saida.substr(11, 5) : null)))
                              .append($('<td/>').addClass('horas').html((horas < 10 ? '0' + horas : horas) + ":" + (minutos < 10 ? '0' + minutos : minutos)));

                        var $obs = result.rows.item(i).obs;

                        if (typeof($obs) === 'string' && $obs.length !== 0) {
                            $linha.attr('title', $obs).addClass('comObs').tinyTips('title');
                        }
                    }

                    // verificando se cumpriu o expediente
                    var horas_dia               = parseInt(sessionStorage.getItem('horas_dia'), 10);
                    var horas_almoco            = parseInt(sessionStorage.getItem('horas_almoco'), 10);
                    var intExpediente           = horas_dia * 60;
                    var intExpedienteCheio      = 0;
                    var intExpedienteIncompleto = 0;
                    var arrExpedienteMinutos    = new Array();
                    var arrExpedienteHoras      = new Array();
                    var intHorasTotal           = 0;

                    $('#tbRelatorio tbody tr').each(function() {
                        var $linha      = $(this);
                        var strData     = $linha.find('td:eq(0)').html();
                        var strHoras    = $linha.find('td:eq(3)').html();
                        var intDia      = parseInt(strData.substr(0, 2), 10);
                        var intHora     = parseInt(strHoras.substr(0, 2), 10)
                        var intMinuto   = parseInt(strHoras.substr(3, 2), 10)

                        // crio uma classe para todas as linhas de mesmo dia
                        $linha.addClass('dia' + intDia);

                        if (arrExpedienteMinutos[intDia]) {
                            arrExpedienteMinutos[intDia] = arrExpedienteMinutos[intDia] + ((intHora * 60) + intMinuto);
                        } else {
                            arrExpedienteMinutos[intDia] = ((intHora * 60) + intMinuto);
                        }

                        arrExpedienteHoras[intDia] = arrExpedienteMinutos[intDia] / 60;
                    });

                    // marco todos os dias em que as horas do expediente não foram cumpridas
                    // e contabilizo para gerar o gráfico
                    for (var i in arrExpedienteMinutos) {
                        if (arrExpedienteMinutos[i] < intExpediente) {
                            $('#tbRelatorio tbody tr.dia' + i).addClass('expedienteMenor');

                            intExpedienteIncompleto++;
                        } else {
                            intExpedienteCheio++;
                        }
                    }

                    // gero um gráfico de pizza com a média de cumprimento do expediente
                    var objGraphMedia = new jGCharts.Api();

                    $('<img>')
                    .attr('src', objGraphMedia.make({
                        data        : [[intExpedienteCheio], [intExpedienteIncompleto]],
                        type        : 'p3',
                        size        : '250x150',
                        axis_labels : ['Sim', 'Não'],
                        title       : 'Pontualidade'
                    }))
                    .addClass('graph')
                    .appendTo($('#Ponto'));

                    // gero um gráfico por dia de barras com as horas trabalhadas por dia
                    var objGraphExpediente = new jGCharts.Api();

                    $('<img>')
                    .attr('src', objGraphExpediente.make({
                        data        : [arrExpedienteHoras],
                        axis_labels : ['Dias Trabalhados'],
                        size        : '250x150',
                        type        : 'bvg',
                        colors      : ['41599b'],
                        bar_width   : 5,
                        bar_spacing : 1,
                        title       : 'Horas trabalhadas por dia'
                    }))
                    .addClass('graph')
                    .appendTo($('#Ponto'));

                    // gero um gráfico informando se supriu as horas mensais
                    // contabilizando as horas trabalhadas
                    var arrDiasTrabalho = sessionStorage.getItem('dias_trabalho').split(',');
                    var intDiasMes      = parseInt($('.ui-datepicker-calendar tr .ui-state-default:last').text());
                    var intDiasMeta     = 0;

                    // aponto o objeto da data para o primeiro dia do mês informado
                    var arrData = strData.split('-');
                    var objData = new Date(arrData[0], arrData[1], arrData[2]);
                    objData.setMonth(arrData[1] - 1);
                    objData.setDate(1);

                    // contando os dias da semana que o usuário trabalha
                    for (i = 1; i <= intDiasMes; i++) {
                        var intDia = objData.getDate();
                        var bUtil = $.inArray(objData.getDay().toString(), arrDiasTrabalho);

                        if (bUtil >= 0) {
                            intDiasMeta++;
                        }

                        objData.setDate(objData.getDate() + 1);
                    }

                    for (i in arrExpedienteHoras) {
                        intHorasTotal += parseInt(arrExpedienteHoras[i]);
                    }

                    var objGraphMeta = new jGCharts.Api();
                    var intHorasMes = horas_dia * intDiasMeta;

                    $('<img>')
                    .attr('src', objGraphMeta.make({
                        data        : [[intHorasTotal, intHorasMes]],
                        type        : 'bhg',
                        size        : '250x120',
                        axis_labels : [' '],
                        legend      : ['Cumpridas (' + intHorasTotal + ')', 'Mensal (' + intHorasMes + ')'],
                        title       : 'Meta de horas do mês',
                        colors      : ['DDD6F5', '5131C9'],
                        bar_width   : 30,
                        bar_spacing : 10,
                        grid        : false
                    }))
                    .addClass('graph')
                    .appendTo($('#Ponto'));
                } else {
                    // sem relatório
                    $('<tr/>')
                    .append($('<td/>')
                        .attr('colspan', '4')
                        .addClass('noResult')
                        .html('Sem relatório para este período'))
                    .appendTo($('#tbRelatorio tbody'));
                }
            },
            function(tz, error) {
                console.log(error);
            });
        });
    },

    /**
     * Troca de sessão, se loga como um usuário subordinado
     */
    _trocaUsuario: function(objUsuario) {
        $('<div/>')
        .attr('id', 'troca-form')
        .html('Você deseja efetuar login como este usuário?')
        .appendTo($('#Ponto'));

        $("#troca-form").dialog({
            title: 'Logar como usuário',
            width: 350,
            modal: true,
            resizable: false,
            buttons: {
                "Continuar": function() {
                    // salvo o estado do usuário inicial
                    if (sessionStorage.getItem('inicial') == null) {
                        sessionStorage.setItem('inicial', JSON.stringify({
                            'id': sessionStorage.getItem('id'),
                            'nome': sessionStorage.getItem('nome'),
                            'login': sessionStorage.getItem('login'),
                            'email': sessionStorage.getItem('email'),
                            'horas_dia': sessionStorage.getItem('horas_dia'),
                            'horas_almoco': sessionStorage.getItem('horas_almoco'),
                            'owner': sessionStorage.getItem('owner')
                        }));
                    }

                    Ponto._criaSessao(objUsuario);

                    window.location.reload();
                },
                "Fechar": function() {
                    $(this).dialog('close');

                    $('#cadastro-form').remove();
                }
            },
            close: function() {
                $("#cadastro-form").remove();
            }
        });
    },

    /**
     * Modal de erro
     */
    _showErro: function(mensagem) {
        $('<div/>')
        .html(mensagem)
        .attr('id', 'error')
        .appendTo($('#Ponto'))
        .dialog({
            title:'Erro',
            width: 350,
            resizable: false,
            modal: true,
            buttons: {
                'Fechar': function() {
                    $(this).dialog('close');

                    $('#error').remove();
                }
            }
        });
    },

    /**
     * Modal de mensagem
     */
    _showMsg: function(mensagem) {
        $('<div/>')
        .html(mensagem)
        .attr('id', 'message')
        .appendTo($('#Ponto'))
        .dialog({
            title:'',
            width: 350,
            resizable: false,
            modal: true,
            buttons: {
                'Fechar': function() {
                    $(this).dialog('close');

                    $('#message').remove();
                }
            }
        });
    },

    /**
     * Crio a sessão do usuário no sessionStorage do navegador (HTML5)
     */
    _criaSessao: function(dados) {
        sessionStorage.setItem('dias_trabalho', dados.dias_trabalho);
        sessionStorage.setItem('email', dados.email);
        sessionStorage.setItem('horas_almoco', dados.horas_almoco);
        sessionStorage.setItem('horas_dia', dados.horas_dia);
        sessionStorage.setItem('id', dados.id);
        sessionStorage.setItem('login', dados.login);
        sessionStorage.setItem('nome', dados.nome);
        sessionStorage.setItem('owner', dados.owner);
    },

    /**
     * Validação do form de cadastro
     */
    _validaCadastro: function() {
        var bValid = new String();

        if ($('#nome').val().toString().length === 0) {
            bValid += 'Nome inválido.<br>';
        }

        if ($('#usuario').val().toString().length === 0) {
            bValid += 'Login inválido.<br>';
        }

        if ($('#email').val().toString().match(/^[A-Za-z0-9_\-\.]+@[A-Za-z0-9_\-\.]{2,}\.[A-Za-z0-9]{2,}(\.[A-Za-z0-9])?/) === null) {
            bValid += 'E-mail inválido.<br>';
        }

        if ($('input[type=password]').is(':visible')) {
            if ($('#senha').val().toString().length === 0) {
                bValid += 'Senha inválida.<br>';
            }

            if ($('#senha_confirmacao').val() !== $('#senha').val()) {
                bValid += 'Senha e confirmação são diferentes.<br>';
            }
        }

        if ($('#horas_dia').val().toString().match(/^[0-9]+$/) === null) {
            bValid += 'Carga horária inválida.<br>';
        }

        if (bValid && $('#horas_almoco').val().toString().match(/^[0-9]+$/) === null) {
            bValid += 'Intervalo inválido.<br>';
        }

        if (parseInt($('#horas_dia').val()) < parseInt($('#horas_almoco').val())) {
            bValid += 'Você não pode ter um intervalo maior que sua carga horária.<br>';
        }

        return bValid;
    },
    
    /**
     * Cria o formulário de login
     */
    login: function() {
        $('<div/>')
        .attr('id', 'login-form')
        .appendTo($('#Ponto'));

        var $fieldset = $('<fieldset/>')
        .append($('<label/>')
            .attr('for', 'usuario')
            .html('Usuário')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'usuario')
                .attr('id', 'usuario')
                .addClass('text ui-widget-content ui-corner-all')))
        .append($('<label/>')
            .attr('for', 'senha')
            .html('Senha')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha')
                .attr('id', 'senha')
                .addClass('text ui-widget-content ui-corner-all')));

        $('#login-form').append($('<form/>').append($fieldset)).dialog({
            title: 'Efetuar login',
            width: 250,
            modal: true,
            resizable: false,
            buttons: {
                "Login": function() {
                    var bValid = true;
                        bValid = bValid && $('#usuario').val().length !== 0;
                        bValid = bValid && $('#senha').val().length !== 0;

                    if (bValid === true) {
                        Ponto._getConnection().transaction(function(tx) {
                            var sql = "SELECT u.id, u.owner, u.login, "
                                    + "p.nome, p.email, p.horas_dia, p.horas_almoco, p.dias_trabalho "
                                    + "FROM usuarios u "
                                    + "JOIN preferencias p "
                                    + "ON u.id = p.usuario_id "
                                    + "WHERE u.login  = ? "
                                    + "AND u.password = ?";

                            var campos = [$('#usuario').val(), $('#senha').val()];

                            tx.executeSql(sql, campos,
                            function(tx, result) {
                                if (result.rows.length > 0) {
                                    Ponto._criaSessao(result.rows.item(0));

                                    window.parent.location.reload();
                                } else {
                                    Ponto._showErro('Login inválido.');
                                }
                            },
                            function(tx, error) {
                                console.log(error);
                            });
                        });
                    } else {
                        Ponto._showErro('Preencha todos os campos');
                    }
                }
            },
            close: function() {
                $('#login-form').remove();

                Ponto.login();
            }
        });
    },

    /**
     * Encerra a sessão do usuário
     */
    logout: function() {
        var mensagem = '';

        // retomar sessão original
        if (sessionStorage.getItem('inicial') !== null) {
            var original = JSON.parse(sessionStorage.getItem('inicial'));
                mensagem = 'Sair do sistema ou apenas \nretornar ao usuário \noriginal?'

            $('<div/>').attr('id', 'troca-form').html(mensagem).appendTo($('#Ponto')).dialog({
                title: 'Logout',
                width: 400,
                modal: true,
                resizable: false,
                buttons: {
                    "Voltar ao estado inicial": function() {
                        // salvo o estado do usuário inicial
                        Ponto._criaSessao(original);

                        sessionStorage.removeItem('inicial');

                        window.location.reload();
                    },
                    "Logout": function() {
                        sessionStorage.clear();

                        window.location.reload();
                    },
                    "Cancelar": function() {
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    $("#troca-form").remove();
                }
            });
        } else {
            mensagem = 'Efetuar logout?'

            $('<div/>').attr('id', 'troca-form').html(mensagem).appendTo($('#Ponto')).dialog({
                title: 'Logout',
                width: 350,
                modal: true,
                resizable: false,
                buttons: {
                    "Continuar": function() {
                        sessionStorage.clear();

                        window.location.reload();
                    },
                    "Cancelar": function() {
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    $("#troca-form").remove();
                }
            });
        }
    },

    /**
     * Registro de ponto
     */
    ponto: function() {
        var arrDiasTrabalho = sessionStorage.getItem('dias_trabalho').split(',');
        var objData = new Date();

        if ($.inArray(objData.getDay().toString(), arrDiasTrabalho) >= 0) {
            $('<div/>').attr('id', 'ponto-form').appendTo($('#Ponto'));
            
            var $fieldset = $('<fieldset/>')
                .append($('<label/>')
                    .attr('for', 'observacao')
                    .html('Observação')
                    .append($('<textarea/>')
                        .attr('name', 'observacao')
                        .attr('id', 'observacao')
                        .addClass('text ui-widget-content ui-corner-all')))
                .append($('<label/>')
                    .attr('for', 'tipoEntrada')
                    .html('Entrada')
                    .addClass('radioContainer')
                    .append($('<input/>')
                        .attr('type', 'radio')
                        .attr('name', 'tipo')
                        .attr('id', 'tipoEntrada')
                        .attr('checked', 'checked')
                        .val('entrada')))
                .append($('<label/>')
                    .attr('for', 'tipoSaida')
                    .html('Saída')
                    .addClass('radioContainer')
                    .append($('<input/>')
                        .attr('type', 'radio')
                        .attr('name', 'tipo')
                        .attr('id', 'tipoSaida')
                        .val('saida')));


            $('#ponto-form')
            .append($('<form/>').append($fieldset))
            .dialog({
                title: 'Registro de Ponto',
                width: 350,
                modal: true,
                resizable: false,
                buttons: {
                    "Registrar": function() {
                        switch ($("#ponto-form input[@name='tipo']:checked").val()) {
                            case 'entrada':
                                // primeiro busco se existe uma entrada sem registro de saída
                                var sql = "SELECT id "
                                        + "FROM ponto "
                                        + "WHERE entrada "
                                        + "BETWEEN STRFTIME('%Y-%m-%d 00:00:00', DATE('NOW', '-3 HOURS')) "
                                        + "AND DATETIME('NOW', '-3 HOURS') "
                                        + "AND saida IS NULL "
                                        + "AND usuario_id = ? "
                                        + "ORDER BY entrada DESC "
                                        + "LIMIT 1"; 
                                    
                                Ponto._getConnection().transaction(function(tx) {
                                        tx.executeSql(sql, [sessionStorage.getItem('id')],
                                        function(tx, result) {
                                            if (result.rows.length == 0) {
                                                Ponto._getConnection().transaction(function(tx) {
                                                    sql = "INSERT INTO ponto(id, entrada, saida, obs, usuario_id) "
                                                        + "VALUES(NULL, DATETIME('NOW', '-3 HOURS'), NULL, ?, ?)";
                                                    
                                                    tx.executeSql(sql, [$("#ponto-form #observacao").val(), sessionStorage.getItem('id')],
                                                        function(tx, result) {
                                                            $(this).dialog('close');

                                                            $("#ponto-form").remove();

                                                            $('<div/>').html('Entrada registrada com sucesso!').attr('id', 'sucesso-ponto').appendTo($('#Ponto')).dialog({
                                                                title:'Registro de Ponto',
                                                                width: 250,
                                                                resizable: false,
                                                                modal: true,
                                                                buttons: {
                                                                    'Fechar': function() {
                                                                        $('#sucesso-ponto').remove();

                                                                        Ponto.relatorio();
                                                                    }
                                                                }
                                                            });
                                                        },
                                                        function(tx, error) {
                                                            Ponto._showErro('Erro registrando entrada.');
                                                        });
                                                });
                                            } else {
                                                Ponto._showErro('Registro de saída não encontrado.');
                                            }
                                        },
                                        function(tx, error) {
                                            console.log(error);
                                        });
                                    });                                        
                                break;
                            
                            case 'saida':
                                sql = "UPDATE ponto "
                                    + "SET saida = DATETIME('NOW', '-3 HOURS'), obs = ? "
                                    + "WHERE entrada BETWEEN "
                                    + "STRFTIME('%Y-%m-%d 00:00:00', DATE('NOW', '-3 HOURS')) "
                                    + "AND DATETIME('NOW', '-3 HOURS') "
                                    + "AND usuario_id = ? "
                                    + "AND id = (SELECT id FROM ponto WHERE entrada BETWEEN "
                                    + "STRFTIME('%Y-%m-%d 00:00:00', DATE('NOW', '-3 HOURS')) "
                                    + "AND DATETIME('NOW', '-3 HOURS') "
                                    + "AND saida IS NULL "
                                    + "AND usuario_id = ? "
                                    + "ORDER BY entrada DESC LIMIT 1)";
                                    
                                Ponto._getConnection().transaction(function(tx) {
                                        tx.executeSql(sql, [$("#ponto-form #observacao").val(), sessionStorage.getItem('id'), sessionStorage.getItem('id')],
                                        function(tx, result) {
                                            $(this).dialog('close');
                                            
                                            $('<div/>').html('Saída registrada com sucesso!').attr('id', 'sucesso-ponto').appendTo($('#Ponto')).dialog({
                                                title:'Registro de Ponto',
                                                width: 250,
                                                resizable: false,
                                                modal: true,
                                                buttons: {
                                                    'Fechar': function() {
                                                        $('#sucesso-ponto').remove();

                                                        Ponto.relatorio();
                                                    }
                                                }
                                            });
                                        },
                                        function(tx, error) {
                                            Ponto._showErro('Erro registrando saída.');
                                        });
                                });
                                break;
                        }
                    },
                    "Fechar": function() {
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    $("#ponto-form").remove();
                }
            });

            // checando o botão correto
            if ($('#tbRelatorio')[0]) {
                if ($('#tbRelatorio tbody td.saida:first').text() == '') {
                    $('#tipoSaida').attr('checked', 'true');
                }
            }
        } else {
            Ponto._showErro('Pelas suas configurações, não é possível bater o ponto hoje.');
        }
    },

    /**
     * Configurações do usuário
     */
    preferencias: function() {
        $('<div/>').attr('id', 'cadastro-form').addClass('widget-preferencias').appendTo($('#Ponto'));

        var $fieldset = $('<fieldset/>')
        .append($('<label/>')
            .attr('for', 'Nome')
            .html('Nome')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'nome')
                .attr('id', 'nome')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'usuario')
            .html('Login')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'usuario')
                .attr('id', 'usuario')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'email')
            .html('E-mail')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'email')
                .attr('id', 'email')
                .addClass('text ui-widget-content ui-corner-all required email')))
        .append($('<label/>')
            .attr('for', 'senha')
            .html('Senha')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha')
                .attr('id', 'senha')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'senha_confirmacao')
            .html('Repita')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha_confirmacao')
                .attr('id', 'senha_confirmacao')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'horas_dia')
            .html('Carga horária')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'horas_dia')
                .attr('id', 'horas_dia')
                .attr('maxlength', '2')
                .mask('9?9',{placeholder:" "})
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'horas_almoco')
            .html('Intervalo')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'horas_almoco')
                .attr('id', 'horas_almoco')
                .attr('maxlength', '2')
                .mask('9?9',{placeholder:" "})
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<fieldset/>')
            .append($('<legend/>')
                .html('Dias de Trabalho'))
            .addClass('diasTrabalho')
            .append($('<label/>')
                .html('Dom')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_0')
                    .val('0')))
            .append($('<label/>')
                .html('Seg')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_1')
                    .attr('checked', true)
                    .val('1')))
            .append($('<label/>')
                .html('Ter')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_2')
                    .attr('checked', true)
                    .val('2')))
            .append($('<label/>')
                .html('Qua')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_3')
                    .attr('checked', true)
                    .val('3')))
            .append($('<label/>')
                .html('Qui')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_4')
                    .attr('checked', true)
                    .val('4')))
            .append($('<label/>')
                .html('Sex')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_5')
                    .attr('checked', true)
                    .val('5')))
            .append($('<label/>')
                .html('Sáb')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_6')
                    .val('6'))))
        .append($('<input/>')
            .attr('type', 'hidden')
            .attr('name', 'owner')
            .attr('id', 'owner'))
        .append($('<input/>')
            .attr('type', 'hidden')
            .attr('name', 'id')
            .attr('id', 'id'));

        $('#cadastro-form').append($('<form/>').attr('id', 'frmCadastro').append($fieldset));

        // preencho o formulário
        $('#cadastro-form form #nome').val(sessionStorage.getItem('nome'));
        $('#cadastro-form form #email').val(sessionStorage.getItem('email'));
        $('#cadastro-form form #usuario').val(sessionStorage.getItem('login')).attr('readonly', 'readonly');
        $('#cadastro-form form #id').val(sessionStorage.getItem('id'));
        $('#cadastro-form form #owner').val(sessionStorage.getItem('owner'));
        $('#cadastro-form form #horas_dia').val(sessionStorage.getItem('horas_dia'));
        $('#cadastro-form form #horas_almoco').val(sessionStorage.getItem('horas_almoco'));

        $('#cadastro-form form input#usuario').hide();
        $('#cadastro-form form input#usuario').parent().hide();

        $('#cadastro-form form input[type=password]').hide();
        $('#cadastro-form form input[type=password]').parent().hide();

        // marco os dias da semana que são trabalhados
        var $dias = sessionStorage.getItem('dias_trabalho').split(',');

        $('#cadastro-form form input[type=checkbox]').attr('checked', false);

        for (var i in $dias) {
            $('#cadastro-form form #dias_trabalho_' + $dias[i]).attr('checked', true);
        }
        
        $("#cadastro-form").dialog({
            title: 'Preferências',
            width: 320,
            modal: true,
            resizable: false,
            buttons: {
                "Atualizar": function() {
                    var bValid = Ponto._validaCadastro();

                    if (bValid.length === 0) {
                        // troco a senha
                        if ($('#cadastro-form form #senha').val().length >= 4) {
                            Ponto._getConnection().transaction(function(tx) {
                                var sql = "UPDATE usuarios SET password = ? WHERE id = ?";

                                tx.executeSql(sql, [$('#cadastro-form form #senha').val(), sessionStorage.getItem('id')]);
                            });
                        }
                        
                        Ponto._getConnection().transaction(function(tx) {
                            var sql = "INSERT OR REPLACE INTO preferencias (usuario_id, horas_dia, horas_almoco, email, nome, dias_trabalho) "
                                    + "VALUES (?, ?, ?, ?, ?, ?)";

                            var $selecionados = $('#cadastro-form form input:checkbox:checked');
                            var $lista = new Array();

                            $selecionados.each(function(i) {
                                $lista[i] = $(this).val();
                            });

                            tx.executeSql(sql, [sessionStorage.getItem('id'), $('#cadastro-form form #horas_dia').val(), $('#cadastro-form form #horas_almoco').val(), $('#cadastro-form form #email').val(), $('#cadastro-form form #nome').val(), $lista.join(',')],
                            function(tx, result) {
                                if (result.rowsAffected == 1) {
                                    $(this).dialog('close');

                                    sessionStorage.setItem('email', $('#cadastro-form form #email').val());
                                    sessionStorage.setItem('nome', $('#cadastro-form form #nome').val());
                                    sessionStorage.setItem('horas_almoco', $('#cadastro-form form #horas_almoco').val());
                                    sessionStorage.setItem('horas_dia', $('#cadastro-form form #horas_dia').val());
                                    sessionStorage.setItem('dias_trabalho', $lista.join(','));

                                    Ponto.init();
                                }
                            });
                        });
                    } else {
                        Ponto._showErro(bValid);
                    }
                },
                "Trocar Senha": function() {
                    $('#cadastro-form form input[type=password]').toggle();
                    $('#cadastro-form form input[type=password]').parent().toggle();
                },
                "Fechar": function() {
                    $(this).dialog('close');

                    $('#cadastro-form').remove();
                }
            },
            close: function() {
                $("#cadastro-form").remove();
            }
        });
    },

    /**
     * Relatório de horas trabalhadas
     */
    relatorio: function() {
        $('#Ponto').empty();

        var objData  = new Date();
        var mesAtual = new Number(objData.getMonth()) + 1;
        var diaAtual = new Number(objData.getDate());

        var mes = mesAtual.length == 1 ? '0' + mesAtual : mesAtual;
        var dia = diaAtual.length == 1 ? '0' + diaAtual : diaAtual;
        var ano = objData.getFullYear();

        // monto um calendário para poder filtrar o relatório
        $('<div/>')
        .attr('id', 'datepicker')
        .appendTo($('#Ponto'))
        .datepicker({
            monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro',
            'Dezembro'],
            dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
            dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta',
            'Sexta', 'Sábado'],
            dateFormat: 'yy-mm-dd',
            firstDay: 0,
            prevText: 'Anterior',
            nextText: 'Pr&oacute;ximo',
            defaultDate: ano + '-' + mes + '-' + dia,
            showOtherMonths: false,
            selectOtherMonths: false,
            hideIfNoPrevNext: true,
            maxDate: '+0d',
            onSelect: function(dateText, inst) {
                var arrData = dateText.split('-');
                var strData = arrData[0] + '-' + arrData[1] + '-' + arrData[2];

                Ponto._criaRelatorio(strData);
            },
            onChangeMonthYear: function(year, month, inst) {
                Ponto._criaRelatorio(year + '-' + month + '-31');
            }
        });

        // crio um relatório com a data atual
        Ponto._criaRelatorio(ano + '-' + mes + '-' + dia);
    },

    /**
     * Listagem de usuários cadastrados subordinados ao usuário logado
     */
    usuarios: function() {
        $('<div/>').addClass('widget-usuarios').appendTo($('#Ponto'));
        
        Ponto._getConnection().transaction(function(tx) {
            var sql = "SELECT u.id, u.owner, u.login, "
                    + "p.nome, p.email, p.horas_dia, p.horas_almoco, p.dias_trabalho "
                    + "FROM usuarios AS u "
                    + "LEFT JOIN preferencias AS p "
                    + "ON u.id = p.usuario_id "
                    + "WHERE u.owner = ? "
                    + "AND u.id != u.owner "
                    + "ORDER BY p.nome ASC";        

            tx.executeSql(sql, [sessionStorage.getItem('id')],
                function(tx, result) {
                    var results = result.rows.length;

                    if (results > 0) {
                        $('<table/>').attr('id', 'tbUsuarios').appendTo($('.widget-usuarios'));
                        $('<tbody/>').append($('<tr/>').append($('<td/>').addClass('id').html('#'))
                                    .append($('<td/>').addClass('login').html('Login'))
                                    .append($('<td/>').addClass('nome').html('Nome'))
                                    .append($('<td/>').addClass('email').html('E-mail'))
                                    .append($('<td/>').addClass('expediente').html('Expediente'))
                                    .addClass('ui-widget-header'))
                                    .appendTo($('#tbUsuarios'));

                        for (var i = 0; i < results; i++) {
                            var usuario = result.rows.item(i);
                            var $linha  = $('<tr/>').attr('id', 'usuario_' + usuario.id).appendTo($('#tbUsuarios tbody'));

                            $linha.append($('<td/>').addClass('id').append($('<input/>').attr('type', 'checkbox').attr('name', 'usuario[]').attr('id', 'usuario_' + usuario.id).val(usuario.id)))
                                  .append($('<td/>').addClass('login').html(usuario.login).click(function() {Ponto._trocaUsuario(usuario);}))
                                  .append($('<td/>').addClass('nome').html(usuario.nome).click(function() {Ponto._trocaUsuario(usuario);}))
                                  .append($('<td/>').addClass('email').html(usuario.email))
                                  .append($('<td/>').addClass('expediente').html(usuario.horas_dia + ' / ' + usuario.horas_almoco));
                        }
                    } else {
                        // sem sub usuários
                        $('<div/>').addClass('noResult').html('Você não possui usuários cadastrados').appendTo($('.widget-usuarios'));                
                    }

                    $('.widget-usuarios').dialog({
                        title: 'Usuários',
                        width: 600,
                        modal: true,
                        resizable: false,
                        buttons: {
                            'Cadastrar Usuário': function() {
                                $('<div/>').attr('id', 'cadastro-form').appendTo($('#Ponto'));

                                var $fieldset = $('<fieldset/>')
                                .append($('<label/>')
                                    .attr('for', 'Nome')
                                    .html('Nome')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'nome')
                                        .attr('id', 'nome')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'usuario')
                                    .html('Login')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'usuario')
                                        .attr('id', 'usuario')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'email')
                                    .html('E-mail')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'email')
                                        .attr('id', 'email')
                                        .addClass('text ui-widget-content ui-corner-all required email')))
                                .append($('<label/>')
                                    .attr('for', 'senha')
                                    .html('Senha')
                                    .append($('<input/>')
                                        .attr('type', 'password')
                                        .attr('name', 'senha')
                                        .attr('id', 'senha')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'senha_confirmacao')
                                    .html('Repita')
                                    .append($('<input/>')
                                        .attr('type', 'password')
                                        .attr('name', 'senha_confirmacao')
                                        .attr('id', 'senha_confirmacao')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'horas_dia')
                                    .html('Carga horária')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'horas_dia')
                                        .attr('id', 'horas_dia')
                                        .attr('maxlength', '2')
                                        .mask('9?9',{placeholder:" "})
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'horas_almoco')
                                    .html('Intervalo')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'horas_almoco')
                                        .attr('id', 'horas_almoco')
                                        .attr('maxlength', '2')
                                        .mask('9?9',{placeholder:" "})
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<fieldset/>')
                                    .append($('<legend/>')
                                        .html('Dias de Trabalho'))
                                    .addClass('diasTrabalho')
                                    .append($('<label/>')
                                        .html('Dom')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_0')
                                            .val('0')))
                                    .append($('<label/>')
                                        .html('Seg')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_1')
                                            .attr('checked', true)
                                            .val('1')))
                                    .append($('<label/>')
                                        .html('Ter')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_2')
                                            .attr('checked', true)
                                            .val('2')))
                                    .append($('<label/>')
                                        .html('Qua')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_3')
                                            .attr('checked', true)
                                            .val('3')))
                                    .append($('<label/>')
                                        .html('Qui')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_4')
                                            .attr('checked', true)
                                            .val('4')))
                                    .append($('<label/>')
                                        .html('Sex')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_5')
                                            .attr('checked', true)
                                            .val('5')))
                                    .append($('<label/>')
                                        .html('Sáb')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_6')
                                            .val('6'))))
                                .append($('<input/>')
                                    .attr('type', 'hidden')
                                    .attr('name', 'owner')
                                    .attr('id', 'owner'))
                                .append($('<input/>')
                                    .attr('type', 'hidden')
                                    .attr('name', 'id')
                                    .attr('id', 'id'));

                                var $form = $('<form/>')
                                    .attr('id', 'frmCadastro')
                                    .append($fieldset);
            
                                $('#cadastro-form').append($form);
                                $('#cadastro-form form #owner').val(sessionStorage.id);
                                $("#cadastro-form").dialog({
                                    title: 'Cadastro',
                                    width: 250,
                                    modal: true,
                                    resizable: false,
                                    buttons: {
                                        "Cadastrar": function() {
                                            var bValid = Ponto._validaCadastro();

                                            if (bValid.length === 0) {
                                                // procuro se já existe algum usuário com o login
                                                Ponto._getConnection().transaction(function(tx) {
                                                    var sql = "SELECT COUNT(id) AS total "
                                                            + "FROM usuarios "
                                                            + "WHERE login = ? "
                                                            + "LIMIT 1";

                                                    tx.executeSql(sql, [$('#cadastro-form form #usuario').val()],
                                                    function(tx, result) {
                                                        if (result.rows.item(0).total == 0) {
                                                            Ponto._getConnection().transaction(function(tx) {
                                                                var sql = "INSERT OR REPLACE INTO usuarios (owner, login, password) "
                                                                        + "VALUES (?, ?, ?)";

                                                                tx.executeSql(sql, [$('#cadastro-form form #owner').val(), $('#cadastro-form form #usuario').val(), $('#cadastro-form form #senha').val()],
                                                                function(tx, result) {
                                                                    if (result.rowsAffected == 1) {
                                                                        // crio as preferencias
                                                                        Ponto._getConnection().transaction(function(tx) {
                                                                            sql = "INSERT OR REPLACE INTO preferencias (usuario_id, horas_dia, horas_almoco, email, nome, dias_trabalho) "
                                                                                + "VALUES (?, ?, ?, ?, ?, ?)";

                                                                            var $selecionados = $('#cadastro-form form input:checkbox:checked');
                                                                            var $lista = new Array();

                                                                            $selecionados.each(function(i) {
                                                                                $lista[i] = $(this).val();
                                                                            });
                                                                            
                                                                            tx.executeSql(sql, [result.insertId, $('#cadastro-form form #horas_dia').val(), $('#cadastro-form form #horas_almoco').val(), $('#cadastro-form form #email').val(), $('#cadastro-form form #nome').val(), $lista.join(',')],
                                                                            function(tx, result) {
                                                                                if (result.rowsAffected == 1) {
                                                                                    $(this).dialog('close');
                                                                                    
                                                                                    Ponto.init();
                                                                                    Ponto.usuarios();
                                                                                }
                                                                            });
                                                                        });
                                                                    } else {
                                                                        Ponto._showErro('Nome de usuário já em uso, tente outro.');
                                                                    }
                                                                },
                                                                function(tx, error) {
                                                                    console.log(error);
                                                                });
                                                            });   
                                                        } else {
                                                            Ponto._showErro('Nome de usuário já em uso, tente outro.');
                                                        }
                                                    },
                                                    function(tx, error) {
                                                        console.log(error);
                                                    });
                                                });                                                

                                            } else {
                                                Ponto._showErro(bValid);
                                            }
                                        },
                                        "Fechar": function() {
                                            $(this).dialog('close');

                                            $('#cadastro-form').remove();
                                        }
                                    },
                                    close: function() {
                                        $("#cadastro-form").remove();
                                    }
                                });
                            },
                            'Remover selecionados': function() {
                                var $selecionados = $('#tbUsuarios input:checkbox:checked');
                                var $lista = new Array();

                                $selecionados.each(function(i) {
                                    $lista[i] = $(this).val();
                                });

                                if ($lista.length !== 0) {
                                    var $msg = 'Remover permanentemente o(s) usuário(s) '
                                            + 'selecionado(s)? <br>'
                                            + 'Todos os dados relacionados a este usuário '
                                            + 'serão removidos de forma irreversível.';

                                    $('<div/>')
                                    .attr('id', 'apagar-form')
                                    .html($msg)
                                    .appendTo($('#Ponto'))
                                    .dialog({
                                        title: 'Remover usuários',
                                        width: 400,
                                        modal: true,
                                        resizable: false,
                                        buttons: {
                                            "Continuar": function() {
                                                $(this).dialog('close');

                                                $($lista).each(function(i, e) {
                                                    Ponto._getConnection().transaction(function(tx) {
                                                        var sql = "DELETE FROM usuarios WHERE id = ?";
                                                        
                                                        tx.executeSql(sql, [e],
                                                        function(tx, result) {
                                                            //Ponto._showMsg('Usuário removido.');
                                                            $('#tbUsuarios tbody #usuario_' + e).hide();
                                                        },
                                                        function(tx, error) {
                                                            //Ponto._showErro('Erro apagando usuário(s).');
                                                        });
                                                    });
                                                });
                                            },
                                            "Fechar": function() {
                                                $(this).dialog('close');

                                                $('#apagar-form').remove();
                                            }
                                        },
                                        close: function() {
                                            $("#apagar-form").remove();
                                        }
                                    });
                                } else {
                                    $('<div/>')
                                    .attr('id', 'apagar-form')
                                    .html('Selecione algum usuário.')
                                    .appendTo($('#Ponto'))
                                    .dialog({
                                        title: 'Remover usuários',
                                        width: 400,
                                        modal: true,
                                        resizable: false,
                                        buttons: {
                                            "Fechar": function() {
                                                $(this).dialog('close');

                                                $('#apagar-form').remove();
                                            }
                                        },
                                        close: function() {
                                            $("#apagar-form").remove();
                                        }
                                    });
                                }
                            },
                            "Fechar": function() {
                                $(this).dialog('close');

                                $(".widget-usuarios").remove();
                            }
                        },
                        close: function() {
                            $(".widget-usuarios").remove();
                        }
                    });            
                },
                function(tx, error) {

                });
        });
    }
}
