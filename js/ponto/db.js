/**
 * Db
 *
 * Persistência com HTML 5 web database
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @author     Thiago Paes - mrprompt@gmail.com
 * @package    Ponto
 * @subpackage Db
 * @filesource db.js
 * @copyright  Copyright 2011, Thiago Paes
 * @link       http://github.com/mrprompt/Ponto/
 * @version    $Revision: 0.1 $
 * @license    http://www.opensource.org/licenses/mit-license.php The MIT License
 */
Db = {
    /**
     * Recupero o conexão com o banco
     */
    getConnection: function() {
        try {
            if (window.openDatabase) {
                var db = openDatabase("Ponto", "0.1", "Ponto Eletrônico", 200000);

                if (!db) {
                    throw "Erro criando banco de dados, por favor, teste um navegador compatível.";
                }

                return db;
            } else {
                throw "Não foi possível conectar a base de dados, navegador incompatível.";
            }
        } catch(err) {
            throw err;
        }
    }
}
