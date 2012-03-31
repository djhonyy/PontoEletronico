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
 * @filesource ponto.js
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
                                Usuario.preferencias();
                            })))
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Usuários')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Usuario.listar();
                            })))
                    .append($('<li/>')
                        .append($('<a/>')
                            .html('Sair')
                            .attr('href', 'javascript:;')
                            .button()
                            .click(function() {
                                Usuario.logout();
                            }))))
                .append($('<b/>')
                    .html(sessionStorage.getItem('nome')))
                )
            .insertBefore($('#Ponto'));

            /**
             * E scondo o botão de ponto caso hoje não seja um dia de trabalho
             * setado nas configurações do usuário
             */
            var arrDiasTrabalho = sessionStorage.getItem('dias_trabalho').split(',');
            var objData = new Date();

            if ($.inArray(objData.getDay().toString(), arrDiasTrabalho) < 0) {
                $('header nav ul li:eq(0)').hide();
            }

            // mostro o relatório (tela principal)
            Ponto.relatorio();
        } else {
            // primeiro vejo se o navegador tem suporte a web storage
            try {
                Db.getConnection();
            } catch (err) {
                Ponto._showErro(err);
                
                return false;
            }
            
            // crio a estrutura de banco necessária para a app
            Ponto._instala();
                
            // exibo a caixa de login de usuário
            Usuario.login();
        }
    },

    /**
     * Passo inicial, crio as tabelas para uso do sistema e um usuário 
     * temporário para que seja possível adicionar novos usuários
     **/
    _instala: function() {
        try {
            // crio as bases
            Db.getConnection()().transaction(function(tx) {
                var sql;
                
                sql = "CREATE TABLE IF NOT EXISTS usuarios ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "owner INTEGER NULL DEFAULT 1, "
                    + "login CHAR(32) NOT NULL UNIQUE, "
                    + "password CHAR(120) NOT NULL); ";

                tx.executeSql(sql);
            
                sql = "CREATE TABLE IF NOT EXISTS preferencias ("
                    + "usuario_id INTEGER NOT NULL UNIQUE, "
                    + "horas_dia INTEGER DEFAULT (4), "
                    + "horas_almoco INTEGER DEFAULT (1), "
                    + "nome TEXT NOT NULL,  email TEXT, "
                    + "dias_trabalho TEXT);";;

                tx.executeSql(sql);

                sql = "CREATE TABLE IF NOT EXISTS ponto ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "usuario_id INTEGER NOT NULL, "
                    + "entrada DATETIME NOT NULL, "
                    + "saida DATETIME, "
                    + "obs TEXT);";

                tx.executeSql(sql);
            
                sql = "CREATE TRIGGER delete_usuarios DELETE ON usuarios "
                    + "BEGIN "
                    + "     DELETE FROM preferencias WHERE usuario_id = old.id;"
                    + "     DELETE FROM ponto WHERE usuario_id = old.id;"
                    + "END;";

                tx.executeSql(sql);
            
                sql = "SELECT COUNT(id) AS total FROM usuarios";

                tx.executeSql(sql, [], function(tx, result) {
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
                            
                        Usuario.criaSessao(usuario);
                        Ponto.init();
                    }
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

        Db.getConnection().transaction(function(tx) {
            var dataRequest = strData.split('-');
            var ano   = dataRequest[0];
            var mes   = (dataRequest[1].length == 1 ? '0' + dataRequest[1] : dataRequest[1]);
            var dia   = (dataRequest[2].length == 1 ? '0' + dataRequest[2] : dataRequest[2]);
            var ini   = ano + '-' + mes + '-' + '01 00:00:00';
            var fim   = ano + '-' + mes + '-' + dia + ' 23:59:59';
            var date1 = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
            var date2 = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
            var sql   = "SELECT id, entrada, saida, obs "
                      + "FROM ponto "
                      + "WHERE entrada BETWEEN ? AND ? "
                      + "AND usuario_id = ? "
                      + "ORDER BY entrada DESC "
                      + "LIMIT 31";
            
            tx.executeSql(sql, [ini, fim, sessionStorage.getItem('id')],
            function(tx, result) {
                var results = result.rows.length;

                $('<div/>').attr('class', 'widget-relatorio')
                           .addClass('ui-widget ui-widget-content ui-helper-clearfix ui-corner-all')
                           .append($('<table/>').attr('id', 'tbRelatorio'))
                           .appendTo($('#Ponto'));

                $('<thead/>').append($('<tr/>').append($('<th/>').addClass('data').html('Data'))
                                .append($('<th/>').addClass('entrada').html('Entrada'))
                                .append($('<th/>').addClass('saida').html('Saída'))
                                .append($('<th/>').addClass('horas').html('Horas')))
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

                        // balão com a observação do ponto
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

                    $('<img>').appendTo($('#Ponto')).addClass('graph').attr('src', objGraphMedia.make({
                        data        : [[intExpedienteCheio], [intExpedienteIncompleto]],
                        type        : 'p3',
                        size        : '250x150',
                        axis_labels : ['Sim', 'Não'],
                        title       : 'Assiduidade'
                    }));

                    // gero um gráfico por dia de barras com as horas trabalhadas por dia
                    var objGraphExpediente = new jGCharts.Api();

                    $('<img>').appendTo($('#Ponto')).addClass('graph').attr('src', objGraphExpediente.make({
                        data        : [arrExpedienteHoras],
                        axis_labels : ['Dias Trabalhados'],
                        size        : '250x150',
                        type        : 'bvg',
                        colors      : ['41599b'],
                        bar_width   : 5,
                        bar_spacing : 1,
                        title       : 'Horas trabalhadas por dia'
                    }));

                    // gero um gráfico informando se supriu as horas mensais contabilizando as horas trabalhadas
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

                    // gero um gráfico com a meta de horas trabalhadas
                    var objGraphMeta = new jGCharts.Api();
                    var intHorasMes = horas_dia * intDiasMeta;

                    $('<img>').appendTo($('#Ponto')).addClass('graph').attr('src', objGraphMeta.make({
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
                    }));
                } else {
                    // sem relatório
                    $('<tr/>').append($('<td/>').attr('colspan', '4').addClass('noResult').html('Sem relatório para este período')).appendTo($('#tbRelatorio tbody'));
                }
            },
            function(tx, error) {
                console.log(error);
            });
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
                                    
                                Db.getConnection().transaction(function(tx) {
                                        tx.executeSql(sql, [sessionStorage.getItem('id')],
                                        function(tx, result) {
                                            if (result.rows.length == 0) {
                                                Db.getConnection().transaction(function(tx) {
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
                                    
                                Db.getConnection().transaction(function(tx) {
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
    }
}
